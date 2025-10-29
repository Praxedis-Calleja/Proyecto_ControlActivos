import { pool } from '../db.js';
import Joi from 'joi';

const esquemaActivo = Joi.object({
  ID_CategoriaActivos: Joi.number().integer().required(),
  ID_Area: Joi.number().integer().required(),
  Marca: Joi.string().max(50).allow(''),
  Modelo: Joi.string().max(50).allow(''),
  Estado: Joi.string().max(50).required(),
  Fecha_Adquisicion: Joi.date().allow(null, ''),
  Precio_Lista: Joi.number().precision(2).allow(null, '')
});

const obtenerCatalogos = async () => {
  const [categorias] = await pool.query(
    'SELECT ID_CategoriaActivos, Nombre FROM CategoriasActivos ORDER BY Nombre'
  );
  const [areas] = await pool.query(
    'SELECT ID_Area, Nombre_Area FROM Areas ORDER BY Nombre_Area'
  );
  return { categorias, areas };
};

const formateadorFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
const formateadorMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

const obtenerActivos = async () => {
  const [activos] = await pool.query(
    `SELECT
      a.ID_CategoriaActivos,
      a.ID_Area,
      a.Marca,
      a.Modelo,
      a.Estado,
      a.Fecha_Adquisicion,
      a.Precio_Lista,
      c.Nombre AS Categoria,
      ar.Nombre_Area AS Area
    FROM ActivosFijos a
    LEFT JOIN CategoriasActivos c ON c.ID_CategoriaActivos = a.ID_CategoriaActivos
    LEFT JOIN Areas ar ON ar.ID_Area = a.ID_Area
    ORDER BY a.Fecha_Adquisicion IS NULL, a.Fecha_Adquisicion DESC, a.Estado ASC`
  );

  return activos.map((activo) => {
    const fecha = activo.Fecha_Adquisicion ? new Date(activo.Fecha_Adquisicion) : null;
    const precioNumero =
      activo.Precio_Lista !== null && activo.Precio_Lista !== undefined
        ? Number(activo.Precio_Lista)
        : null;

    return {
      ...activo,
      fechaAdquisicionTexto: fecha ? formateadorFecha.format(fecha) : '—',
      precioListaTexto: precioNumero !== null ? formateadorMoneda.format(precioNumero) : '—'
    };
  });
};

const renderActivos = async (req, res, opciones = {}) => {
  const [{ categorias, areas }, activos] = await Promise.all([
    obtenerCatalogos(),
    obtenerActivos()
  ]);

  return res
    .status(opciones.status || 200)
    .render('activos/index', {
      categorias,
      areas,
      activos,
      errores: opciones.errores || [],
      values: opciones.values || {},
      ok: opciones.ok ?? (req.query.ok === '1'),
      mostrarFormulario: opciones.mostrarFormulario ?? false
    });
};

export const getActivos = async (req, res) => {
  await renderActivos(req, res, { mostrarFormulario: req.query.view === 'form' });
};

export const getNuevoActivo = async (req, res) => {
  await renderActivos(req, res, { mostrarFormulario: true });
};

export const postNuevoActivo = async (req, res) => {
  const { error, value } = esquemaActivo.validate(req.body, { abortEarly: false });
  if (error) {
    const mensajes = error.details?.length
      ? error.details.map((detalle) => detalle.message)
      : [error.message];

    return renderActivos(req, res, {
      status: 400,
      errores: mensajes,
      values: req.body,
      mostrarFormulario: true
    });
  }

  const { ID_CategoriaActivos, ID_Area, Marca, Modelo, Estado, Fecha_Adquisicion, Precio_Lista } = value;

  await pool.query(
    `INSERT INTO ActivosFijos
    (ID_CategoriaActivos, ID_Area, Marca, Modelo, Estado, Fecha_Adquisicion, Precio_Lista)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ID_CategoriaActivos,
      ID_Area,
      Marca || null,
      Modelo || null,
      Estado,
      Fecha_Adquisicion || null,
      Precio_Lista || null
    ]
  );

  res.redirect('/activos?ok=1');
};
