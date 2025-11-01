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

const prepararActivo = (activo) => {
  if (!activo) return null;

  const fecha = activo.fecha_compra ? new Date(activo.fecha_compra) : null;
  const precioNumero =
    activo.precio_lista !== null && activo.precio_lista !== undefined
      ? Number(activo.precio_lista)
      : null;
  const idNormalizado =
    activo.id_activo ??
    activo.ID_Activo ??
    activo.id_activo_fijo ??
    activo.ID_Activo_Fijo ??
    activo.id ??
    null;

  return {
    ...activo,
    id_activo: idNormalizado,
    fechaAdquisicionTexto: fecha ? formateadorFecha.format(fecha) : '—',
    precioListaTexto: precioNumero !== null ? formateadorMoneda.format(precioNumero) : '—',
    fecha_compra_formulario: fecha ? fecha.toISOString().slice(0, 10) : ''
  };
};

const obtenerActivoPorId = async (idActivo) => {
  const [filas] = await pool.query(
    `SELECT
      a.*,
      c.nombre AS categoria,
      ar.nombre_area AS area
    FROM activos_fijos a
    LEFT JOIN categorias_activos c ON c.id_categoria_activos = a.id_categoria_activos
    LEFT JOIN areas ar ON ar.id_area = a.id_area
    WHERE a.id_activo = ?
    LIMIT 1`,
    [idActivo]
  );

  if (!filas.length) return null;
  return prepararActivo(filas[0]);
};

const escaparHtml = (texto = '') =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const obtenerActivos = async (busqueda = '') => {
  const termino = typeof busqueda === 'string' ? busqueda.trim() : '';

  let consulta = `SELECT
      a.id_activo,
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
    LEFT JOIN areas ar ON ar.id_area = a.id_area`;

  const parametros = [];

  if (termino) {
    const like = `%${termino}%`;
    const condiciones = [
      'a.marca LIKE ?',
      'a.modelo LIKE ?',
      'a.estado LIKE ?',
      'a.numero_serie LIKE ?',
      'c.nombre LIKE ?',
      'ar.nombre_area LIKE ?'
    ];

    parametros.push(like, like, like, like, like, like);

    const numero = Number.parseInt(termino, 10);
    if (Number.isInteger(numero)) {
      condiciones.push('a.id_activo = ?');
      parametros.push(numero);
    }

    consulta += `
    WHERE ${condiciones.map((condicion) => `(${condicion})`).join(' OR ')}`;
  }

  consulta += `
    ORDER BY a.precio_lista IS NULL, a.precio_lista DESC, a.estado ASC`;

  const [activos] = await pool.query(consulta, parametros);

  return activos.map(prepararActivo);
};

const renderActivos = async (req, res, opciones = {}) => {
  const busquedaOriginal =
    opciones.busqueda ?? req.query?.q ?? req.query?.busqueda ?? '';
  const busquedaTexto =
    typeof busquedaOriginal === 'string' ? busquedaOriginal : '';
  const busquedaNormalizada = busquedaTexto.trim();

  const [{ categorias, areas }, activos] = await Promise.all([
    obtenerCatalogos(),
    obtenerActivos(busquedaNormalizada)
  ]);

  const busquedaActiva = busquedaNormalizada.length > 0;
  const busquedaParaVista = escaparHtml(busquedaTexto);

  return res
    .status(opciones.status || 200)
    .render('activos/index', {
      categorias,
      areas,
      activos,
      errores: opciones.errores || [],
      values: opciones.values || {},
      busqueda: busquedaParaVista,
      busquedaActiva,
      totalCoincidencias: activos.length,
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

export const getDetalleActivo = async (req, res) => {
  const idActivo = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(idActivo) || idActivo <= 0) {
    return res.status(404).render('activos/detalle', { activo: null, ok: false });
  }

  const activo = await obtenerActivoPorId(idActivo);
  if (!activo) {
    return res.status(404).render('activos/detalle', { activo: null, ok: false });
  }

  return res.render('activos/detalle', {
    activo,
    ok: req.query.ok === '1'
  });
};

const renderEditarActivo = async (req, res, opciones = {}) => {
  const { id } = req.params;
  const idActivo = Number.parseInt(id, 10);
  if (!Number.isInteger(idActivo) || idActivo <= 0) {
    return res.status(404).render('activos/editar', {
      activo: null,
      categorias: [],
      areas: [],
      errores: ['El identificador del activo no es válido'],
      values: {},
      activoId: id
    });
  }

  const [{ categorias, areas }, activo] = await Promise.all([
    obtenerCatalogos(),
    obtenerActivoPorId(idActivo)
  ]);

  if (!activo) {
    return res.status(404).render('activos/editar', {
      activo: null,
      categorias,
      areas,
      errores: ['El activo solicitado no fue encontrado'],
      values: {},
      activoId: idActivo
    });
  }

  const valoresBase = {
    id_categoria_activos: activo.id_categoria_activos,
    id_area: activo.id_area,
    marca: activo.marca || '',
    modelo: activo.modelo || '',
    estado: activo.estado || '',
    fecha_compra: activo.fecha_compra_formulario || '',
    precio_lista:
      activo.precio_lista !== null && activo.precio_lista !== undefined
        ? String(activo.precio_lista)
        : '',
    numero_serie: activo.numero_serie || ''
  };

  return res
    .status(opciones.status || 200)
    .render('activos/editar', {
      activo,
      categorias,
      areas,
      errores: opciones.errores || [],
      values: { ...valoresBase, ...(opciones.values || {}) },
      activoId: idActivo
    });
};

export const getEditarActivo = async (req, res) => {
  await renderEditarActivo(req, res);
};

export const postEditarActivo = async (req, res) => {
  const idActivo = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(idActivo) || idActivo <= 0) {
    return res.status(404).render('activos/editar', {
      activo: null,
      categorias: [],
      areas: [],
      errores: ['El identificador del activo no es válido'],
      values: req.body,
      activoId: req.params.id
    });
  }

  const { error, value } = esquemaActivo.validate(req.body, { abortEarly: false });
  if (error) {
    const mensajes = error.details?.length
      ? error.details.map((detalle) => detalle.message)
      : [error.message];

    return renderEditarActivo(req, res, {
      status: 400,
      errores: mensajes,
      values: req.body
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

  const [resultado] = await pool.query(
    `UPDATE activos_fijos
     SET id_categoria_activos = ?,
       id_area = ?,
       marca = ?,
       modelo = ?,
       estado = ?,
       fecha_compra = ?,
       precio_lista = ?,
       numero_serie = ?
     WHERE id_activo = ?
     LIMIT 1`,
    [
      id_categoria_activos,
      id_area,
      marca || null,
      modelo || null,
      estado,
      fecha_compra || null,
      precio_lista || null,
      numero_serie || null,
      idActivo
    ]
  );

  if (!resultado.affectedRows) {
    return renderEditarActivo(req, res, {
      status: 404,
      errores: ['No fue posible actualizar el activo solicitado'],
      values: req.body
    });
  }

  return res.redirect(`/activos/${idActivo}?ok=1`);
};
