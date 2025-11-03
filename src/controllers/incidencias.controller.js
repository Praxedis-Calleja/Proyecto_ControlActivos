import Joi from 'joi';
import { pool } from '../db.js';

const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Crítica'];
const ESTADOS = ['Abierta', 'En progreso', 'En espera', 'Cerrada'];

const esquemaIncidencia = Joi.object({
  id_activo: Joi.number().integer().required(),
  id_departamento: Joi.number().integer().required(),
  id_area: Joi.number().integer().required(),
  id_reporta: Joi.number().integer().required(),
  id_tecnico_asignado: Joi.alternatives().try(Joi.number().integer(), Joi.string().valid('')).allow(null, ''),
  titulo: Joi.string().trim().min(3).max(150).required(),
  descripcion: Joi.string().trim().min(10).required(),
  prioridad: Joi.string().valid(...PRIORIDADES).required(),
  estado: Joi.string().valid(...ESTADOS).required(),
  fecha_reporte: Joi.date().required(),
  fecha_resolucion: Joi.alternatives().try(Joi.date(), Joi.string().valid('')).allow(null, ''),
  causa_raiz: Joi.string().allow('', null),
  acciones_realizadas: Joi.string().allow('', null),
  observaciones: Joi.string().allow('', null)
});

const obtenerCatalogos = async () => {
  const [activos] = await pool.query(
    `SELECT id_activo, marca, modelo, numero_serie
     FROM activos_fijos
     ORDER BY marca, modelo, numero_serie`
  );

  const [departamentos] = await pool.query(
    'SELECT id_departamento, nombre_departamento FROM Departamentos ORDER BY nombre_departamento'
  );

  const [areas] = await pool.query(
    'SELECT id_area, nombre_area, id_departamento FROM Areas ORDER BY nombre_area'
  );

  const [usuarios] = await pool.query(
    `SELECT ID_Usuario, Nombre, Apellido, Rol
     FROM Usuarios
     ORDER BY Nombre, Apellido`
  );

  return { activos, departamentos, areas, usuarios };
};

const normalizarValores = (datos = {}) => ({
  ...datos,
  id_tecnico_asignado: datos.id_tecnico_asignado ?? '',
  fecha_resolucion: datos.fecha_resolucion ?? ''
});

export const getNuevaIncidencia = async (req, res) => {
  try {
    const catalogos = await obtenerCatalogos();
    return res.render('incidencias/nueva', {
      ...catalogos,
      prioridades: PRIORIDADES,
      estados: ESTADOS,
      errores: [],
      values: {},
      ok: req.query.ok === '1'
    });
  } catch (error) {
    console.error('Error al obtener datos para incidencias:', error);
    return res.status(500).render('incidencias/nueva', {
      activos: [],
      departamentos: [],
      areas: [],
      usuarios: [],
      prioridades: PRIORIDADES,
      estados: ESTADOS,
      errores: ['No se pudieron cargar los catálogos. Intenta de nuevo.'],
      values: {},
      ok: false
    });
  }
};

export const postNuevaIncidencia = async (req, res) => {
  try {
    const { error, value } = esquemaIncidencia.validate(req.body, { abortEarly: false });

    if (error) {
      const catalogos = await obtenerCatalogos();
      const errores = error.details.map((detalle) => detalle.message);
      return res.status(400).render('incidencias/nueva', {
        ...catalogos,
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        errores,
        values: normalizarValores(req.body),
        ok: false
      });
    }

    const {
      id_activo,
      id_departamento,
      id_area,
      id_reporta,
      id_tecnico_asignado,
      titulo,
      descripcion,
      prioridad,
      estado,
      fecha_reporte,
      fecha_resolucion,
      causa_raiz,
      acciones_realizadas,
      observaciones
    } = value;

    const camposOpcionales = (dato) => {
      if (dato === undefined || dato === null || dato === '') return null;
      if (typeof dato === 'string' && dato.trim() === '') return null;
      return dato;
    };

    await pool.query(
      `INSERT INTO Incidencias (
        id_activo,
        id_departamento,
        id_area,
        id_reporta,
        id_tecnico_asignado,
        titulo,
        descripcion,
        prioridad,
        estado,
        fecha_reporte,
        fecha_resolucion,
        causa_raiz,
        acciones_realizadas,
        observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_activo,
        id_departamento,
        id_area,
        id_reporta,
        camposOpcionales(id_tecnico_asignado),
        titulo,
        descripcion,
        prioridad,
        estado,
        fecha_reporte,
        camposOpcionales(fecha_resolucion),
        camposOpcionales(causa_raiz),
        camposOpcionales(acciones_realizadas),
        camposOpcionales(observaciones)
      ]
    );

    return res.redirect('/incidencias/nueva?ok=1');
  } catch (error) {
    console.error('Error al guardar incidencia:', error);
    try {
      const catalogos = await obtenerCatalogos();
      return res.status(500).render('incidencias/nueva', {
        ...catalogos,
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        errores: ['Ocurrió un error al guardar la incidencia. Inténtalo nuevamente.'],
        values: normalizarValores(req.body),
        ok: false
      });
    } catch (catalogError) {
      console.error('Error adicional al cargar catálogos:', catalogError);
      return res.status(500).render('incidencias/nueva', {
        activos: [],
        departamentos: [],
        areas: [],
        usuarios: [],
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        errores: ['Ocurrió un error grave.'],
        values: normalizarValores(req.body),
        ok: false
      });
    }
  }
};
