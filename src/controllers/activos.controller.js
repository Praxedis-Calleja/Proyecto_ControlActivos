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
    'SELECT id_categoria_activos, nombre FROM categorias_activos ORDER BY nombre'
  );
  const [areas] = await pool.query(
    'SELECT id_area, nombre_area FROM Areas ORDER BY nombre_area'
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
      a.id_categoria_activos,
      a.id_area,
      a.marca,
      a.modelo,
      a.estado,
      a.fecha_compra,
      a.precio_lista,
      c.nombre AS categoria,
      ar.nombre_area AS area
    FROM activos_fijos a
    LEFT JOIN categorias_activos c ON c.id_categoria_activos = a.id_categoria_activos
    LEFT JOIN areas ar ON ar.id_area = a.id_area
    ORDER BY a.precio_lista IS NULL, a.precio_lista DESC, a.estado ASC`
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
    `INSERT INTO activos_fijos
    (id_categoria_activos, id_area, marca, modelo, estado, fecha_compra, precio_lista)
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
