import { pool } from '../db.js';
import Joi from 'joi';

const esquemaActivo = Joi.object({
  id_categoria_activos: Joi.number().integer().required(),
  id_area: Joi.number().integer().required(),
  marca: Joi.string().max(50).allow(''),
  modelo: Joi.string().max(50).allow(''),
  estado: Joi.string().max(50).required(),
  fecha_compra: Joi.alternatives().try(Joi.date(), Joi.string().valid('')).allow(null, ''),
  precio_lista: Joi.alternatives()
    .try(Joi.number().precision(2), Joi.string().valid(''))
    .allow(null, ''),
  numero_serie: Joi.string().max(100).allow('', null)
}).unknown(true);

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
      a.numero_serie,
      c.nombre AS categoria,
      ar.nombre_area AS area
    FROM activos_fijos a
    LEFT JOIN categorias_activos c ON c.id_categoria_activos = a.id_categoria_activos
    LEFT JOIN areas ar ON ar.id_area = a.id_area
    ORDER BY a.precio_lista IS NULL, a.precio_lista DESC, a.estado ASC`
  );

  return activos.map((activo) => {
    const fecha = activo.fecha_compra ? new Date(activo.fecha_compra) : null;
    const precioNumero =
      activo.precio_lista !== null && activo.precio_lista !== undefined
        ? Number(activo.precio_lista)
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

  const {
    id_categoria_activos,
    id_area,
    marca,
    modelo,
    estado,
    fecha_compra,
    precio_lista,
    numero_serie
  } = value;

  await pool.query(
    `INSERT INTO activos_fijos
    (id_categoria_activos, id_area, marca, modelo, estado, fecha_compra, precio_lista, numero_serie)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_categoria_activos,
      id_area,
      marca || null,
      modelo || null,
      estado,
      fecha_compra || null,
      precio_lista || null,
      numero_serie || null
    ]
  );

  res.redirect('/activos?ok=1');
};
