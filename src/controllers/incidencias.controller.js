import Joi from 'joi';
import { pool } from '../db.js';
import { generarBajaPdf, generarDiagnosticoPdf } from '../services/reportesPdf.service.js';
import {
  EVIDENCIA_TEMPORAL_CONFIG,
  guardarEvidenciasTemporales,
  obtenerEvidenciasTemporales,
  parseImagenesTemporales
} from '../services/evidenciasTemporales.service.js';

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const ESTADOS = ['ABIERTA', 'EN_PROCESO', 'CERRADA', 'CANCELADA'];
const TIPOS_INCIDENCIA = ['CORRECTIVO', 'PREVENTIVO', 'INSTALACION', 'OTRO'];
const ORIGENES_INCIDENCIA = ['USUARIO', 'SISTEMA', 'MANTENIMIENTO', 'OTRO'];

let cacheColumnasEspecificacionesActivos;

const obtenerColumnasEspecificacionesActivos = async () => {
  if (cacheColumnasEspecificacionesActivos) {
    return cacheColumnasEspecificacionesActivos;
  }

  try {
    const [rows] = await pool.query(
      "SHOW COLUMNS FROM activos_fijos WHERE Field IN ('procesador', 'memoria_ram', 'almacenamiento')"
    );

    const disponibles = {
      procesador: false,
      memoria_ram: false,
      almacenamiento: false
    };

    for (const columna of rows) {
      if (columna.Field === 'procesador') {
        disponibles.procesador = true;
      } else if (columna.Field === 'memoria_ram') {
        disponibles.memoria_ram = true;
      } else if (columna.Field === 'almacenamiento') {
        disponibles.almacenamiento = true;
      }
    }

    cacheColumnasEspecificacionesActivos = disponibles;
  } catch (error) {
    console.warn(
      'No se pudieron verificar las columnas de especificaciones en activos_fijos:',
      error
    );
    cacheColumnasEspecificacionesActivos = {
      procesador: false,
      memoria_ram: false,
      almacenamiento: false
    };
  }

  return cacheColumnasEspecificacionesActivos;
};

const construirSelectEspecificacionesActivo = async (aliasTabla, aliasPrefijo = '') => {
  const columnasDisponibles = await obtenerColumnasEspecificacionesActivos();
  const prefijo = aliasPrefijo ? `${aliasPrefijo}_` : '';

  return [
    columnasDisponibles.procesador
      ? `${aliasTabla}.procesador AS ${prefijo}procesador`
      : `NULL AS ${prefijo}procesador`,
    columnasDisponibles.memoria_ram
      ? `${aliasTabla}.memoria_ram AS ${prefijo}memoria_ram`
      : `NULL AS ${prefijo}memoria_ram`,
    columnasDisponibles.almacenamiento
      ? `${aliasTabla}.almacenamiento AS ${prefijo}almacenamiento`
      : `NULL AS ${prefijo}almacenamiento`
  ];
};

const esquemaDiagnostico = Joi.object({
  descripcion_trabajo: Joi.string()
    .trim()
    .min(10)
    .required()
    .messages({
      'string.empty': 'Describe las acciones realizadas por el técnico.',
      'string.min': 'La descripción del trabajo debe tener al menos 10 caracteres.'
    }),
  diagnostico: Joi.string()
    .trim()
    .min(10)
    .required()
    .messages({
      'string.empty': 'Captura el diagnóstico del técnico.',
      'string.min': 'El diagnóstico debe tener al menos 10 caracteres.'
    }),
  fecha_diagnostico: Joi.date()
    .required()
    .messages({
      'date.base': 'Proporciona una fecha de diagnóstico válida.',
      'any.required': 'La fecha de diagnóstico es obligatoria.'
    }),
  firma_tecnico: Joi.string()
    .trim()
    .min(3)
    .required()
    .messages({
      'string.empty': 'Captura la firma del técnico.',
      'string.min': 'La firma debe tener al menos 3 caracteres.'
    }),
  procesador: Joi.string().trim().allow(''),
  memoria_ram: Joi.string().trim().allow(''),
  almacenamiento: Joi.string().trim().allow(''),
  tiempo_uso: Joi.string()
    .trim()
    .max(150)
    .allow('')
    .messages({
      'string.max': 'El tiempo de uso no puede superar los 150 caracteres.'
    }),
  requiere_baja: Joi.string()
    .valid('SI', 'NO')
    .default('NO'),
  motivo_baja: Joi.when('requiere_baja', {
    is: 'SI',
    then: Joi.string()
      .trim()
      .min(10)
      .required()
      .messages({
        'string.empty': 'Describe el motivo de baja del activo.',
        'string.min': 'El motivo de baja debe tener al menos 10 caracteres.'
      }),
    otherwise: Joi.string().allow('').trim().optional()
  }),
  autorizado_por: Joi.when('requiere_baja', {
    is: 'SI',
    then: Joi.string()
      .trim()
      .min(3)
      .required()
      .messages({
        'string.empty': 'Indica quién autoriza la baja del activo.',
        'string.min': 'El nombre de autorización debe tener al menos 3 caracteres.'
      }),
    otherwise: Joi.string().allow('').trim().optional()
  }),
  observaciones_baja: Joi.string().allow('').trim().optional(),
  evidencia_url: Joi.string()
    .uri()
    .allow('', null)
    .optional()
});

const esquemaIncidencia = Joi.object({
  id_activo: Joi.number().integer().required(),
  usa_contacto_externo: Joi.string().valid('0', '1').default('0'),
  id_usuario: Joi.when('usa_contacto_externo', {
    is: '1',
    then: Joi.alternatives()
      .try(Joi.number().integer(), Joi.valid(null), Joi.string().valid(''))
      .optional(),
    otherwise: Joi.number()
      .integer()
      .required()
      .messages({
        'any.required': 'Selecciona el usuario que reporta la incidencia.'
      })
  }),
  descripcion_problema: Joi.string().trim().min(10).required(),
  tipo_incidencia: Joi.string().valid(...TIPOS_INCIDENCIA).required(),
  origen_incidencia: Joi.string().valid(...ORIGENES_INCIDENCIA).required(),
  prioridad: Joi.string().valid(...PRIORIDADES).required(),
  estado: Joi.string().valid(...ESTADOS).required(),
  cerrada_en: Joi.alternatives().try(Joi.date(), Joi.string().valid('')).allow(null, ''),
  nombre_contacto_externo: Joi.when('usa_contacto_externo', {
    is: '1',
    then: Joi.string()
      .trim()
      .min(3)
      .max(120)
      .required()
      .messages({
        'string.empty': 'Captura el nombre del contacto externo.',
        'any.required': 'Captura el nombre del contacto externo.'
      }),
    otherwise: Joi.string().trim().max(120).allow('', null)
  }),
  tipo_contacto_externo: Joi.string().trim().max(50).allow('', null),
  datos_contacto_externo: Joi.when('usa_contacto_externo', {
    is: '1',
    then: Joi.string()
      .trim()
      .min(5)
      .max(120)
      .required()
      .messages({
        'string.empty': 'Captura los datos de contacto externo.',
        'any.required': 'Captura los datos de contacto externo.'
      }),
    otherwise: Joi.string().trim().max(120).allow('', null)
  })
});

const obtenerCatalogos = async () => {
  const [activos] = await pool.query(
    `SELECT id_activo, marca, modelo, numero_serie
     FROM activos_fijos
     ORDER BY marca, modelo, numero_serie`
  );

  const [usuarios] = await pool.query(
    `SELECT id_usuario, nombre, apellido, rol
     FROM usuarios
     ORDER BY nombre, apellido`
  );

  return { activos, usuarios };
};

const toDatetimeLocal = (valor) => {
  if (!valor) return '';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toISOString().slice(0, 16);
};

const limpiarTextoOpcional = (valor) => {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto.length ? texto : null;
};

const obtenerTextoPlano = (valor) => String(valor ?? '').trim();

const construirContactoReporte = (registro = {}) => {
  const nombreExterno = obtenerTextoPlano(registro.nombre_contacto_externo);
  const tipoExterno = obtenerTextoPlano(registro.tipo_contacto_externo);
  const datosExterno = obtenerTextoPlano(registro.datos_contacto_externo);

  if (nombreExterno) {
    const partes = [nombreExterno];
    if (tipoExterno) {
      partes.push(tipoExterno);
    }

    const encabezado = partes.join(' · ');
    if (datosExterno) {
      return `${encabezado} (${datosExterno})`;
    }
    return encabezado;
  }

  const nombreUsuario = obtenerTextoPlano(
    registro.usuario_reporta ?? registro.nombre_reporta ?? ''
  );

  return nombreUsuario;
};

const normalizarValores = (datos = {}) => {
  const valores = { ...datos };
  let cerrada = valores.cerrada_en ?? '';

  const usaContactoExterno = (() => {
    if (String(datos.usa_contacto_externo ?? '') === '1') {
      return true;
    }

    const sinUsuario =
      datos.id_usuario === undefined || datos.id_usuario === null || datos.id_usuario === '';
    if (!sinUsuario) {
      return false;
    }

    const nombre = obtenerTextoPlano(datos.nombre_contacto_externo);
    const tipo = obtenerTextoPlano(datos.tipo_contacto_externo);
    const datosContacto = obtenerTextoPlano(datos.datos_contacto_externo);

    return Boolean(nombre || tipo || datosContacto);
  })();

  if (cerrada instanceof Date || typeof cerrada === 'number') {
    cerrada = toDatetimeLocal(cerrada);
  } else if (typeof cerrada === 'string') {
    const texto = cerrada.trim();
    if (!texto) {
      cerrada = '';
    } else if (texto.includes(' ')) {
      const [fecha, hora] = texto.split(' ');
      if (fecha && hora) {
        cerrada = `${fecha}T${hora.slice(0, 5)}`;
      }
    } else if (texto.includes('T') && texto.length >= 16) {
      cerrada = texto.slice(0, 16);
    } else {
      const comoFecha = toDatetimeLocal(texto);
      cerrada = comoFecha || texto;
    }
  }

  return {
    ...valores,
    id_usuario:
      valores.id_usuario === undefined || valores.id_usuario === null ? '' : valores.id_usuario,
    cerrada_en: cerrada,
    nombre_contacto_externo: datos.nombre_contacto_externo ?? '',
    tipo_contacto_externo: datos.tipo_contacto_externo ?? '',
    datos_contacto_externo: datos.datos_contacto_externo ?? '',
    usa_contacto_externo: usaContactoExterno ? '1' : '0'
  };
};

const normalizarValoresDiagnostico = (datos = {}, tecnicoActual = '') => ({
  descripcion_trabajo: datos.descripcion_trabajo ?? '',
  diagnostico: datos.diagnostico ?? '',
  fecha_diagnostico: datos.fecha_diagnostico
    ? String(datos.fecha_diagnostico).slice(0, 10)
    : '',
  firma_tecnico: datos.firma_tecnico ?? tecnicoActual,
  procesador: datos.procesador ?? '',
  memoria_ram: datos.memoria_ram ?? '',
  almacenamiento: datos.almacenamiento ?? '',
  tiempo_uso: datos.tiempo_uso ?? '',
  requiere_baja: datos.requiere_baja ?? 'NO',
  motivo_baja: datos.motivo_baja ?? '',
  autorizado_por: datos.autorizado_por ?? '',
  observaciones_baja: datos.observaciones_baja ?? '',
  evidencia_url: datos.evidencia_url ?? ''
});

const construirConfigVistaEvidencias = () => {
  const maxPeso = (EVIDENCIA_TEMPORAL_CONFIG.maxPesoBytes / (1024 * 1024)).toFixed(1);
  const maxPesoMB = maxPeso.endsWith('.0') ? maxPeso.slice(0, -2) : maxPeso;
  return {
    maxImagenes: EVIDENCIA_TEMPORAL_CONFIG.maxImagenes,
    maxPesoBytes: EVIDENCIA_TEMPORAL_CONFIG.maxPesoBytes,
    maxPesoMB,
    formatos: EVIDENCIA_TEMPORAL_CONFIG.formatosPermitidos,
    formatosTexto: EVIDENCIA_TEMPORAL_CONFIG.formatosPermitidos
      .map((tipo) => tipo.replace('image/', '').toUpperCase())
      .join(', ')
  };
};

const formatearFecha = (valor) => {
  if (!valor) return '';
  try {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toISOString().slice(0, 10);
  } catch (error) {
    return '';
  }
};

const DIAS_REPORTE_RECIENTE = 30;

const normalizarFechaFiltro = (valor) => {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const formato = /^\d{4}-\d{2}-\d{2}$/;
  if (formato.test(texto)) {
    return texto;
  }
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 10);
};

const obtenerFechaIso = (fecha = new Date()) => {
  try {
    const instancia = fecha instanceof Date ? fecha : new Date(fecha);
    if (Number.isNaN(instancia.getTime())) return null;
    return instancia.toISOString().slice(0, 10);
  } catch (error) {
    return null;
  }
};

const esFechaReciente = (valor) => {
  if (!valor) return false;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return false;
  const diferencia = Date.now() - fecha.getTime();
  const limite = DIAS_REPORTE_RECIENTE * 24 * 60 * 60 * 1000;
  return diferencia <= limite;
};

const construirFiltrosReportes = (query = {}) => {
  const tipo = ['diagnostico', 'baja', 'todos'].includes(query.tipo)
    ? query.tipo
    : 'todos';
  const termino = typeof query.q === 'string' ? query.q.trim() : '';
  let desde = normalizarFechaFiltro(query.desde);
  let hasta = normalizarFechaFiltro(query.hasta);
  const recientes = query.recientes === '1';

  if (recientes && !hasta) {
    hasta = obtenerFechaIso();
  }

  if (recientes && !desde) {
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_REPORTE_RECIENTE);
    desde = obtenerFechaIso(limite);
  }

  if (desde && hasta && desde > hasta) {
    const temp = desde;
    desde = hasta;
    hasta = temp;
  }

  return {
    tipo,
    termino,
    desde,
    hasta,
    recientes,
    aplicoFiltros: Boolean(termino || desde || hasta || recientes || tipo !== 'todos')
  };
};

const formatearFechaLarga = (valor) => {
  if (!valor) return '';
  try {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long'
    }).format(fecha);
  } catch (error) {
    return '';
  }
};

const formatearFechaHoraCorta = (valor) => {
  if (!valor) return '';
  try {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(fecha);
  } catch (error) {
    return '';
  }
};

const descomponerTiempoUso = (valor) => {
  const lineas = String(valor ?? '')
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  let motivo = '';
  let observaciones = '';
  let autorizado_por = '';
  let tiempoUso = '';
  const trabajo = [];

  for (const linea of lineas) {
    const enMinusculas = linea.toLowerCase();
    if (!tiempoUso && enMinusculas.startsWith('tiempo de uso:')) {
      tiempoUso = linea.slice('tiempo de uso:'.length).trim();
    } else if (!motivo && enMinusculas.startsWith('motivo:')) {
      motivo = linea.slice('motivo:'.length).trim();
    } else if (!autorizado_por && enMinusculas.startsWith('autorizado por:')) {
      autorizado_por = linea.slice('autorizado por:'.length).trim();
    } else if (!observaciones && enMinusculas.startsWith('observaciones:')) {
      observaciones = linea.slice('observaciones:'.length).trim();
    } else {
      trabajo.push(linea);
    }
  }

  return {
    trabajo: trabajo.join('\n'),
    motivo,
    observaciones,
    autorizado_por,
    tiempoUso
  };
};

const obtenerIncidenciaPorId = async (idIncidencia) => {
  const camposEspecificaciones = await construirSelectEspecificacionesActivo('a');

  const [rows] = await pool.query(
    `SELECT
       i.id_incidencia,
       i.descripcion_problema,
       i.estado,
       i.tipo_incidencia,
       i.origen_incidencia,
       i.prioridad,
       i.id_usuario,
       i.id_activo,
       i.creada_en,
       i.cerrada_en,
       i.nombre_contacto_externo,
       i.tipo_contacto_externo,
       i.datos_contacto_externo,
       a.marca,
       a.modelo,
       a.numero_serie,
       a.placa_activo,
       a.propietario_contacto,
       ${camposEspecificaciones.join(',\n       ')},
       CONCAT_WS(' ', a.marca, a.modelo) AS activo_nombre,
       CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_reporta
     FROM incidencias i
     INNER JOIN activos_fijos a ON a.id_activo = i.id_activo
     LEFT JOIN (
       SELECT
         ultimos.id_incidencia,
         ultimos.procesador,
         ultimos.memoria_ram,
         ultimos.almacenamiento
       FROM (
         SELECT
           d.id_incidencia,
           d.procesador,
           d.memoria_ram,
           d.almacenamiento,
           ROW_NUMBER() OVER (PARTITION BY d.id_incidencia ORDER BY d.creado_en DESC, d.id_diagnostico DESC) AS rn
         FROM diagnostico d
       ) ultimos
       WHERE ultimos.rn = 1
     ) ud ON ud.id_incidencia = i.id_incidencia
     LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
     WHERE i.id_incidencia = ?
     LIMIT 1`,
    [idIncidencia]
  );

  const incidencia = rows[0] || null;

  if (!incidencia) {
    return null;
  }

  incidencia.contacto_reporte = construirContactoReporte(incidencia);

  return incidencia;
};

const obtenerDiagnosticosIncidencia = async (idIncidencia) => {
  const [rows] = await pool.query(
    `SELECT
       d.id_diagnostico,
       d.id_incidencia,
       d.id_activo,
       d.tiempo_uso,
       d.diagnostico,
       d.fecha_diagnostico,
       d.creado_en,
       d.procesador,
       d.memoria_ram,
       d.almacenamiento,
       d.evidenciaURL,
       CONCAT_WS(' ', ut.nombre, ut.apellido) AS tecnico_nombre,
       b.ID_Baja AS baja_id,
       b.Fecha_Baja AS baja_fecha
     FROM diagnostico d
     LEFT JOIN usuarios ut ON ut.id_usuario = d.id_usuario_tecnico
     LEFT JOIN reportesbaja b ON b.id_diagnostico = d.id_diagnostico
     WHERE d.id_incidencia = ?
     ORDER BY d.creado_en DESC`,
    [idIncidencia]
  );

  return rows.map((registro) => ({
    ...registro,
    ...descomponerTiempoUso(registro.tiempo_uso),
    fecha_diagnostico_fmt: formatearFechaLarga(registro.fecha_diagnostico) || 'Sin fecha',
    creado_en_fmt: formatearFechaHoraCorta(registro.creado_en) || 'Sin fecha',
    reporte_baja: registro.baja_id
      ? {
          id: registro.baja_id,
          fecha_baja_fmt: formatearFechaLarga(registro.baja_fecha) || 'Sin fecha',
          url: `/incidencias/${registro.id_incidencia}/diagnostico/baja/pdf/${registro.id_diagnostico}`
        }
      : null
  }));
};

export const getListadoIncidencias = async (req, res) => {
  const estadoActualizado = req.query.estadoOk === '1';
  const estadoErrorActualizacion = req.query.estadoError === '1';
  const estadoSolicitado =
    typeof req.query.estado === 'string' ? req.query.estado.trim().toUpperCase() : '';
  const textoBusqueda = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const soloActuales = req.query.hoy === '1';

  const estadosPermitidos = new Set(['ABIERTA', 'EN_PROCESO', 'CERRADA']);

  const filtros = {
    estado: estadosPermitidos.has(estadoSolicitado) ? estadoSolicitado : '',
    busqueda: textoBusqueda,
    hoy: soloActuales
  };

  try {
    const condiciones = ["i.estado <> 'CANCELADA'"];
    const parametros = [];

    if (filtros.estado) {
      condiciones.push('i.estado = ?');
      parametros.push(filtros.estado);
    }

    if (filtros.busqueda) {
      const termino = `%${filtros.busqueda.replace(/\s+/g, ' ').trim()}%`;
      condiciones.push(
        "(CONCAT_WS(' ', a.marca, a.modelo) LIKE ? OR CONCAT_WS(' ', u.nombre, u.apellido) LIKE ? OR i.descripcion_problema LIKE ?)"
      );
      parametros.push(termino, termino, termino);
    }

    if (filtros.hoy) {
      condiciones.push('DATE(i.creada_en) = CURDATE()');
    }

    const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         i.id_incidencia,
         i.descripcion_problema,
         i.estado,
         i.tipo_incidencia,
         i.origen_incidencia,
         i.prioridad,
         i.creada_en,
         a.marca,
         a.modelo,
         a.numero_serie,
        a.placa_activo,
        CONCAT_WS(' ', a.marca, a.modelo) AS activo_nombre,
        CONCAT_WS(' ', u.nombre, u.apellido) AS usuario_reporta,
        i.nombre_contacto_externo,
        i.tipo_contacto_externo,
        i.datos_contacto_externo,
        COALESCE(h.total_diagnosticos, 0) AS total_diagnosticos,
        h.ultimo_diagnostico
      FROM incidencias i
       INNER JOIN activos_fijos a ON a.id_activo = i.id_activo
       LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN (
         SELECT id_incidencia, COUNT(*) AS total_diagnosticos, MAX(creado_en) AS ultimo_diagnostico
         FROM diagnostico
         GROUP BY id_incidencia
       ) h ON h.id_incidencia = i.id_incidencia
       ${whereSql}
       ORDER BY i.creada_en DESC`,
      parametros
    );

    const incidencias = rows.map((incidencia) => {
      const contactoReporte = construirContactoReporte(incidencia);

      return {
        ...incidencia,
        creada_en_fmt: formatearFechaHoraCorta(incidencia.creada_en) || 'Sin fecha',
        ultimo_diagnostico_fmt: incidencia.ultimo_diagnostico
          ? formatearFechaHoraCorta(incidencia.ultimo_diagnostico)
          : '',
        descripcion_problema: incidencia.descripcion_problema || '',
        usuario_reporta: incidencia.usuario_reporta || 'No registrado',
        contacto_reporte: contactoReporte || incidencia.usuario_reporta || 'No registrado',
        activo_nombre: incidencia.activo_nombre || 'Activo sin nombre',
        numero_serie: incidencia.numero_serie || '',
        placa_activo: incidencia.placa_activo || ''
      };
    });

    return res.render('incidencias/index', {
      incidencias,
      error: null,
      pageTitle: 'Incidencias',
      estados: ESTADOS,
      estadoActualizado,
      estadoErrorActualizacion,
      filtros
    });
  } catch (error) {
    console.error('Error al listar incidencias:', error);
    return res.status(500).render('incidencias/index', {
      incidencias: [],
      error: 'No se pudieron cargar las incidencias registradas. Intenta nuevamente más tarde.',
      pageTitle: 'Incidencias',
      estados: ESTADOS,
      estadoActualizado,
      estadoErrorActualizacion,
      filtros
    });
  }
};

const obtenerReportesDiagnostico = async (filtros) => {
  const condiciones = [];
  const parametros = [];

  if (filtros.termino) {
    const like = `%${filtros.termino}%`;
    condiciones.push(`(
      i.descripcion_problema LIKE ? OR
      a.marca LIKE ? OR
      a.modelo LIKE ? OR
      a.numero_serie LIKE ? OR
      a.placa_activo LIKE ? OR
      d.diagnostico LIKE ? OR
      CONCAT_WS(' ', ut.nombre, ut.apellido) LIKE ?
    )`);
    parametros.push(like, like, like, like, like, like, like);
  }

  if (filtros.desde) {
    condiciones.push('DATE(d.fecha_diagnostico) >= ?');
    parametros.push(filtros.desde);
  }

  if (filtros.hasta) {
    condiciones.push('DATE(d.fecha_diagnostico) <= ?');
    parametros.push(filtros.hasta);
  }

  const whereClausula = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
        d.id_diagnostico,
        d.id_incidencia,
        d.fecha_diagnostico,
        d.creado_en,
        d.diagnostico,
        d.tiempo_uso,
        d.evidenciaURL,
        i.estado,
        i.prioridad,
        i.descripcion_problema,
        CONCAT_WS(' ', a.marca, a.modelo) AS activo_nombre,
        a.numero_serie,
        a.placa_activo,
        CONCAT_WS(' ', ut.nombre, ut.apellido) AS tecnico_nombre,
        b.ID_Baja AS baja_id,
        b.Fecha_Baja AS baja_fecha
      FROM diagnostico d
      INNER JOIN incidencias i ON i.id_incidencia = d.id_incidencia
      INNER JOIN activos_fijos a ON a.id_activo = d.id_activo
      LEFT JOIN usuarios ut ON ut.id_usuario = d.id_usuario_tecnico
      LEFT JOIN reportesbaja b ON b.id_diagnostico = d.id_diagnostico
      ${whereClausula}
      ORDER BY d.fecha_diagnostico DESC, d.creado_en DESC`,
    parametros
  );

  return rows.map((registro) => {
    const detalles = descomponerTiempoUso(registro.tiempo_uso);

    return {
      id: registro.id_diagnostico,
      incidenciaId: registro.id_incidencia,
      fechaDiagnostico: formatearFechaLarga(registro.fecha_diagnostico) || 'Sin fecha registrada',
      creadoEn: formatearFechaHoraCorta(registro.creado_en) || 'Sin registro',
      diagnostico: registro.diagnostico || '',
      trabajo: detalles.trabajo || '',
      descripcionProblema: registro.descripcion_problema || '',
      evidencia: registro.evidenciaURL || '',
      tecnico: registro.tecnico_nombre || 'Técnico sin asignar',
      activo: {
        nombre: registro.activo_nombre || 'Activo sin nombre',
        numeroSerie: registro.numero_serie || 'No registrado',
        placa: registro.placa_activo || 'No registrada'
      },
      incidencia: {
        estado: registro.estado || 'Sin estado',
        prioridad: registro.prioridad || 'Sin prioridad'
      },
      reporteBaja: registro.baja_id
        ? {
            id: registro.baja_id,
            fecha: formatearFechaLarga(registro.baja_fecha) || 'Sin fecha registrada',
            url: `/incidencias/${registro.id_incidencia}/diagnostico/baja/pdf/${registro.id_diagnostico}`
          }
        : null,
      pdfUrl: `/incidencias/${registro.id_incidencia}/diagnostico/pdf/${registro.id_diagnostico}`,
      esReciente: esFechaReciente(registro.fecha_diagnostico)
    };
  });
};

const obtenerReportesBaja = async (filtros) => {
  const condiciones = [];
  const parametros = [];

  if (filtros.termino) {
    const like = `%${filtros.termino}%`;
    condiciones.push(`(
      i.descripcion_problema LIKE ? OR
      a.marca LIKE ? OR
      a.modelo LIKE ? OR
      a.numero_serie LIKE ? OR
      a.placa_activo LIKE ? OR
      d.diagnostico LIKE ? OR
      CONCAT_WS(' ', ut.nombre, ut.apellido) LIKE ?
    )`);
    parametros.push(like, like, like, like, like, like, like);
  }

  if (filtros.desde) {
    condiciones.push('DATE(b.Fecha_Baja) >= ?');
    parametros.push(filtros.desde);
  }

  if (filtros.hasta) {
    condiciones.push('DATE(b.Fecha_Baja) <= ?');
    parametros.push(filtros.hasta);
  }

  const whereClausula = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
        b.ID_Baja AS id_baja,
        b.ID_Activo AS id_activo,
        b.Fecha_Baja AS fecha_baja,
        b.Fecha_Reimpresion AS fecha_reimpresion,
        d.id_diagnostico,
        d.fecha_diagnostico,
        d.tiempo_uso,
        d.diagnostico,
        d.evidenciaURL AS evidencia,
        CONCAT_WS(' ', ut.nombre, ut.apellido) AS tecnico,
        a.marca,
        a.modelo,
        a.numero_serie,
        a.placa_activo,
        a.propietario_nombre_completo AS propietario,
        a.propietario_contacto AS contacto,
        c.nombre AS categoria,
        ar.nombre_area AS area,
        dep.nombre_departamento AS departamento,
        i.id_incidencia,
        i.descripcion_problema
      FROM reportesbaja b
      INNER JOIN diagnostico d ON d.id_diagnostico = b.id_diagnostico
      INNER JOIN activos_fijos a ON a.id_activo = b.ID_Activo
      LEFT JOIN categorias_activos c ON c.id_categoria_activos = a.id_categoria_activos
      LEFT JOIN areas ar ON ar.id_area = a.id_area
      LEFT JOIN departamentos dep ON dep.id_departamento = ar.id_departamento
      LEFT JOIN usuarios ut ON ut.id_usuario = d.id_usuario_tecnico
      LEFT JOIN incidencias i ON i.id_incidencia = d.id_incidencia
      ${whereClausula}
      ORDER BY b.Fecha_Baja DESC, b.ID_Baja DESC`,
    parametros
  );

  return rows.map((registro) => {
    const detalles = descomponerTiempoUso(registro.tiempo_uso);

    return {
      id: registro.id_baja,
      fechaBajaTexto: formatearFechaLarga(registro.fecha_baja) || 'Sin fecha',
      fechaReimpresionTexto: formatearFechaLarga(registro.fecha_reimpresion) || 'Sin fecha',
      fechaDiagnosticoTexto: formatearFechaLarga(registro.fecha_diagnostico) || 'Sin fecha',
      motivo: detalles.motivo || 'Sin motivo especificado',
      observaciones: detalles.observaciones || 'Sin observaciones',
      autorizadoPor: detalles.autorizado_por || '',
      trabajo: detalles.trabajo || '',
      tecnico: registro.tecnico || 'No registrado',
      evidencia: registro.evidencia || null,
      diagnostico: registro.diagnostico || 'Sin diagnóstico capturado',
      diagnosticoId: registro.id_diagnostico,
      pdfUrl: `/incidencias/${registro.id_incidencia}/diagnostico/baja/pdf/${registro.id_diagnostico}`,
      incidencia: registro.id_incidencia
        ? {
            id: registro.id_incidencia,
            descripcion: registro.descripcion_problema || 'Sin descripción'
          }
        : null,
      activo: {
        id: registro.id_activo,
        nombre: [registro.marca, registro.modelo]
          .map((parte) => (parte ? String(parte).trim() : ''))
          .filter(Boolean)
          .join(' ') || 'Activo sin nombre',
        numeroSerie: registro.numero_serie || 'No registrado',
        placa: registro.placa_activo || 'No registrada',
        categoria: registro.categoria || 'Sin categoría',
        area: registro.area || 'Sin área',
        departamento: registro.departamento || 'Sin departamento',
        propietario: registro.propietario || 'Sin propietario',
        contacto: registro.contacto || 'Sin contacto'
      },
      esReciente: esFechaReciente(registro.fecha_baja)
    };
  });
};

export const getReportesDiagnostico = async (req, res) => {
  const filtros = construirFiltrosReportes(req.query);

  try {
    const diagnosticosPromise =
      filtros.tipo === 'baja' ? Promise.resolve([]) : obtenerReportesDiagnostico(filtros);
    const bajasPromise = filtros.tipo === 'diagnostico' ? Promise.resolve([]) : obtenerReportesBaja(filtros);

    const [reportesDiagnostico, reportesBaja] = await Promise.all([diagnosticosPromise, bajasPromise]);

    return res.render('incidencias/reportes', {
      reportesDiagnostico,
      reportesBaja,
      filtros,
      tipoSeleccionado: filtros.tipo,
      error: null,
      pageTitle: 'Buscador de reportes'
    });
  } catch (error) {
    console.error('Error al listar reportes de diagnóstico:', error);
    return res.status(500).render('incidencias/reportes', {
      reportesDiagnostico: [],
      reportesBaja: [],
      filtros,
      tipoSeleccionado: filtros.tipo,
      error: 'No se pudieron cargar los reportes. Intenta nuevamente más tarde.',
      pageTitle: 'Buscador de reportes'
    });
  }
};

const formatearFechaHora = (valor) => {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  if (!texto.includes('T')) {
    return texto;
  }

  const base = texto.replace('T', ' ');
  return base.length === 16 ? `${base}:00` : base;
};

export const getNuevaIncidencia = async (req, res) => {
  try {
    const catalogos = await obtenerCatalogos();
    return res.render('incidencias/nueva', {
      ...catalogos,
      prioridades: PRIORIDADES,
      estados: ESTADOS,
      tiposIncidencia: TIPOS_INCIDENCIA,
      origenesIncidencia: ORIGENES_INCIDENCIA,
      errores: [],
      values: {},
      ok: req.query.ok === '1',
      pageTitle: 'Registrar incidencia'
    });
  } catch (error) {
    console.error('Error al obtener datos para incidencias:', error);
    return res.status(500).render('incidencias/nueva', {
      activos: [],
      usuarios: [],
      prioridades: PRIORIDADES,
      estados: ESTADOS,
      tiposIncidencia: TIPOS_INCIDENCIA,
      origenesIncidencia: ORIGENES_INCIDENCIA,
      errores: ['No se pudieron cargar los catálogos. Intenta de nuevo.'],
      values: {},
      ok: false,
      pageTitle: 'Registrar incidencia'
    });
  }
};

export const postNuevaIncidencia = async (req, res) => {
  try {
    const { error, value } = esquemaIncidencia.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      const catalogos = await obtenerCatalogos();
      const errores = error.details.map((detalle) => detalle.message);
      return res.status(400).render('incidencias/nueva', {
        ...catalogos,
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        tiposIncidencia: TIPOS_INCIDENCIA,
        origenesIncidencia: ORIGENES_INCIDENCIA,
        errores,
        values: normalizarValores(req.body),
        ok: false,
        pageTitle: 'Registrar incidencia'
      });
    }

    const {
      id_activo,
      id_usuario,
      descripcion_problema,
      tipo_incidencia,
      origen_incidencia,
      prioridad,
      estado,
      cerrada_en,
      nombre_contacto_externo,
      tipo_contacto_externo,
      datos_contacto_externo,
      usa_contacto_externo
    } = value;

    const usaContactoExterno = usa_contacto_externo === '1';

    const idUsuarioSesion = req.session?.user?.id_usuario ?? null;
    const idUsuarioFinal = usaContactoExterno ? idUsuarioSesion : id_usuario;

    if (idUsuarioFinal === null || idUsuarioFinal === undefined || idUsuarioFinal === '') {
      const catalogos = await obtenerCatalogos();
      const mensajeError = usaContactoExterno
        ? 'No se pudo identificar al usuario que registra la incidencia.'
        : 'Selecciona el usuario que reporta la incidencia.';

      return res.status(400).render('incidencias/nueva', {
        ...catalogos,
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        tiposIncidencia: TIPOS_INCIDENCIA,
        origenesIncidencia: ORIGENES_INCIDENCIA,
        errores: [mensajeError],
        values: normalizarValores(req.body),
        ok: false,
        pageTitle: 'Registrar incidencia'
      });
    }
    const nombreExterno = usaContactoExterno
      ? limpiarTextoOpcional(nombre_contacto_externo)
      : null;
    const tipoExterno = usaContactoExterno
      ? limpiarTextoOpcional(tipo_contacto_externo)
      : null;
    const datosExterno = usaContactoExterno
      ? limpiarTextoOpcional(datos_contacto_externo)
      : null;

    await pool.query(
      `INSERT INTO incidencias (
        descripcion_problema,
        estado,
        tipo_incidencia,
        origen_incidencia,
        prioridad,
        id_usuario,
        id_activo,
        cerrada_en,
        nombre_contacto_externo,
        tipo_contacto_externo,
        datos_contacto_externo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        descripcion_problema,
        estado,
        tipo_incidencia,
        origen_incidencia,
        prioridad,
        idUsuarioFinal,
        id_activo,
        formatearFechaHora(cerrada_en),
        nombreExterno,
        tipoExterno,
        datosExterno
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
        tiposIncidencia: TIPOS_INCIDENCIA,
        origenesIncidencia: ORIGENES_INCIDENCIA,
        errores: ['Ocurrió un error al guardar la incidencia. Inténtalo nuevamente.'],
        values: normalizarValores(req.body),
        ok: false,
        pageTitle: 'Registrar incidencia'
      });
    } catch (catalogError) {
      console.error('Error adicional al cargar catálogos:', catalogError);
      return res.status(500).render('incidencias/nueva', {
        activos: [],
        usuarios: [],
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        tiposIncidencia: TIPOS_INCIDENCIA,
        origenesIncidencia: ORIGENES_INCIDENCIA,
        errores: ['Ocurrió un error grave.'],
        values: normalizarValores(req.body),
        ok: false,
        pageTitle: 'Registrar incidencia'
      });
    }
  }
};

export const getEditarIncidencia = async (req, res) => {
  const idIncidencia = Number(req.params.id);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  try {
    const incidencia = await obtenerIncidenciaPorId(idIncidencia);

    if (!incidencia) {
      return res.status(404).send('Incidencia no encontrada');
    }

    const catalogos = await obtenerCatalogos();

    return res.render('incidencias/editar', {
      ...catalogos,
      prioridades: PRIORIDADES,
      estados: ESTADOS,
      tiposIncidencia: TIPOS_INCIDENCIA,
      origenesIncidencia: ORIGENES_INCIDENCIA,
      errores: [],
      values: normalizarValores(incidencia),
      ok: req.query.ok === '1',
      incidenciaId: idIncidencia,
      pageTitle: 'Editar incidencia'
    });
  } catch (error) {
    console.error('Error al cargar incidencia para edición:', error);
    return res.status(500).send('Error al cargar la incidencia para edición.');
  }
};

export const postEditarIncidencia = async (req, res) => {
  const idIncidencia = Number(req.params.id);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  let incidencia;
  try {
    incidencia = await obtenerIncidenciaPorId(idIncidencia);
  } catch (error) {
    console.error('Error al recuperar incidencia para edición:', error);
    return res.status(500).send('Error al recuperar la incidencia.');
  }

  if (!incidencia) {
    return res.status(404).send('Incidencia no encontrada');
  }

  const { error, value } = esquemaIncidencia.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    try {
      const catalogos = await obtenerCatalogos();
      return res.status(400).render('incidencias/editar', {
        ...catalogos,
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        tiposIncidencia: TIPOS_INCIDENCIA,
        origenesIncidencia: ORIGENES_INCIDENCIA,
        errores: error.details.map((detalle) => detalle.message),
        values: normalizarValores(req.body),
        ok: false,
        incidenciaId: idIncidencia,
        pageTitle: 'Editar incidencia'
      });
    } catch (catalogError) {
      console.error('Error al cargar catálogos en edición:', catalogError);
      return res.status(500).send('Error al validar la incidencia.');
    }
  }

  const {
    id_activo,
    id_usuario,
    descripcion_problema,
    tipo_incidencia,
    origen_incidencia,
    prioridad,
    estado,
    cerrada_en,
    nombre_contacto_externo,
    tipo_contacto_externo,
    datos_contacto_externo,
    usa_contacto_externo
  } = value;

  const usaContactoExterno = usa_contacto_externo === '1';
  const idUsuarioFinal = usaContactoExterno ? null : id_usuario;
  const nombreExterno = usaContactoExterno
    ? limpiarTextoOpcional(nombre_contacto_externo)
    : null;
  const tipoExterno = usaContactoExterno
    ? limpiarTextoOpcional(tipo_contacto_externo)
    : null;
  const datosExterno = usaContactoExterno
    ? limpiarTextoOpcional(datos_contacto_externo)
    : null;

  try {
    await pool.query(
      `UPDATE incidencias
          SET descripcion_problema = ?,
              estado = ?,
              tipo_incidencia = ?,
              origen_incidencia = ?,
              prioridad = ?,
              id_usuario = ?,
              id_activo = ?,
              cerrada_en = ?,
              nombre_contacto_externo = ?,
              tipo_contacto_externo = ?,
              datos_contacto_externo = ?
        WHERE id_incidencia = ?
        LIMIT 1`,
      [
        descripcion_problema,
        estado,
        tipo_incidencia,
        origen_incidencia,
        prioridad,
        idUsuarioFinal,
        id_activo,
        formatearFechaHora(cerrada_en),
        nombreExterno,
        tipoExterno,
        datosExterno,
        idIncidencia
      ]
    );

    return res.redirect(`/incidencias/${idIncidencia}/editar?ok=1`);
  } catch (errorActualizacion) {
    console.error('Error al actualizar incidencia:', errorActualizacion);
    try {
      const catalogos = await obtenerCatalogos();
      return res.status(500).render('incidencias/editar', {
        ...catalogos,
        prioridades: PRIORIDADES,
        estados: ESTADOS,
        tiposIncidencia: TIPOS_INCIDENCIA,
        origenesIncidencia: ORIGENES_INCIDENCIA,
        errores: ['Ocurrió un error al actualizar la incidencia. Inténtalo nuevamente.'],
        values: normalizarValores(req.body),
        ok: false,
        incidenciaId: idIncidencia,
        pageTitle: 'Editar incidencia'
      });
    } catch (catalogError) {
      console.error('Error adicional al cargar catálogos en edición:', catalogError);
      return res.status(500).send('Error grave al actualizar la incidencia.');
    }
  }
};

export const getDiagnosticoIncidencia = async (req, res) => {
  const idIncidencia = Number(req.params.id);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  try {
    const incidencia = await obtenerIncidenciaPorId(idIncidencia);

    if (!incidencia) {
      return res.status(404).send('Incidencia no encontrada');
    }

    const diagnosticos = await obtenerDiagnosticosIncidencia(idIncidencia);
    const nombreTecnico = [req.session.user?.nombre, req.session.user?.apellido]
      .filter(Boolean)
      .join(' ');

    const values = normalizarValoresDiagnostico(
      {},
      nombreTecnico
    );

    if (!values.fecha_diagnostico) {
      values.fecha_diagnostico = formatearFecha(new Date());
    }

    const reporteBajaCreado = (() => {
      if (typeof req.query.b === 'string' && req.query.b.startsWith('/')) {
        const idBaja = Number.isInteger(Number(req.query.bid))
          ? Number(req.query.bid)
          : null;
        const fechaBaja = typeof req.query.bf === 'string' ? req.query.bf : null;
        return {
          url: req.query.b,
          id: idBaja,
          fecha: fechaBaja
        };
      }
      return null;
    })();

    const pageTitle = 'Diagnóstico de incidencia';

    const permiteDiagnostico = incidencia.estado !== 'CERRADA';
    const evidenciaConfig = construirConfigVistaEvidencias();

    return res.render('incidencias/diagnostico', {
      incidencia,
      diagnosticos,
      errores: [],
      values,
      ok: req.query.ok === '1',
      diagnosticoIdCreado:
        Number.isInteger(Number(req.query.h)) && Number(req.query.h) > 0
          ? Number(req.query.h)
          : null,
      reporteBajaCreado,
      pageTitle,
      estados: ESTADOS,
      permiteDiagnostico,
      estadoActualizado: req.query.estadoOk === '1',
      estadoError: req.query.estadoError === '1',
      evidenciaConfig
    });
  } catch (error) {
    console.error('Error al cargar formulario de diagnóstico:', error);
    return res.status(500).send('Error al cargar el formulario de diagnóstico.');
  }
};

export const postCambiarEstadoIncidencia = async (req, res) => {
  const idIncidencia = Number(req.params.id);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  const estadoSolicitado =
    typeof req.body.estado === 'string' ? req.body.estado.trim().toUpperCase() : '';

  if (!ESTADOS.includes(estadoSolicitado)) {
    return res.redirect('/incidencias?estadoError=1');
  }

  let incidencia;
  try {
    incidencia = await obtenerIncidenciaPorId(idIncidencia);
  } catch (error) {
    console.error('Error al recuperar incidencia para actualizar estado:', error);
    return res.status(500).send('Error al actualizar el estado de la incidencia.');
  }

  if (!incidencia) {
    return res.status(404).send('Incidencia no encontrada');
  }

  const cerradaEn =
    estadoSolicitado === 'CERRADA'
      ? formatearFechaHora(new Date().toISOString().slice(0, 19)) ||
        incidencia.cerrada_en ||
        null
      : null;

  try {
    await pool.query(
      `UPDATE incidencias
          SET estado = ?,
              cerrada_en = ?
        WHERE id_incidencia = ?`,
      [estadoSolicitado, cerradaEn, idIncidencia]
    );

    return res.redirect('/incidencias?estadoOk=1');
  } catch (error) {
    console.error('Error al actualizar estado de incidencia:', error);
    return res.redirect('/incidencias?estadoError=1');
  }
};

export const postDiagnosticoIncidencia = async (req, res) => {
  const idIncidencia = Number(req.params.id);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  const tecnicoId = req.session.user?.id_usuario;
  if (!tecnicoId) {
    return res.redirect('/login');
  }

  let incidencia;
  try {
    incidencia = await obtenerIncidenciaPorId(idIncidencia);
  } catch (error) {
    console.error('Error al recuperar incidencia:', error);
    return res.status(500).send('Error al recuperar la incidencia.');
  }

  if (!incidencia) {
    return res.status(404).send('Incidencia no encontrada');
  }

  const pageTitle = 'Diagnóstico de incidencia';
  const nombreTecnico = [req.session.user?.nombre, req.session.user?.apellido]
    .filter(Boolean)
    .join(' ');
  const permiteDiagnostico = incidencia.estado !== 'CERRADA';
  const evidenciaConfig = construirConfigVistaEvidencias();

  if (!permiteDiagnostico) {
    try {
      const diagnosticos = await obtenerDiagnosticosIncidencia(idIncidencia);
      return res.status(400).render('incidencias/diagnostico', {
        incidencia,
        diagnosticos,
        errores: ['La incidencia está cerrada, no se pueden registrar diagnósticos ni generar bajas.'],
        values: normalizarValoresDiagnostico({}, nombreTecnico),
        ok: false,
        diagnosticoIdCreado: null,
        reporteBajaCreado: null,
        pageTitle,
        estados: ESTADOS,
        permiteDiagnostico,
        estadoActualizado: false,
        estadoError: false,
        evidenciaConfig
      });
    } catch (diagnosticoError) {
      console.error('Error al recuperar diagnósticos en incidencia cerrada:', diagnosticoError);
      return res.status(500).send('Error al recuperar los diagnósticos de la incidencia.');
    }
  }

  const { error, value } = esquemaDiagnostico.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    try {
      const diagnosticos = await obtenerDiagnosticosIncidencia(idIncidencia);

      return res.status(400).render('incidencias/diagnostico', {
        incidencia,
        diagnosticos,
        errores: error.details.map((detalle) => detalle.message),
        values: normalizarValoresDiagnostico(req.body, nombreTecnico),
        ok: false,
        diagnosticoIdCreado: null,
        reporteBajaCreado: null,
        pageTitle,
        estados: ESTADOS,
        permiteDiagnostico,
        estadoActualizado: false,
        estadoError: false,
        evidenciaConfig
      });
    } catch (diagnosticoError) {
      console.error('Error al recuperar diagnósticos:', diagnosticoError);
      return res.status(500).send('Error al validar el diagnóstico.');
    }
  }

  const {
    descripcion_trabajo,
    diagnostico,
    fecha_diagnostico,
    firma_tecnico,
    procesador,
    memoria_ram,
    almacenamiento,
    requiere_baja,
    motivo_baja,
    autorizado_por,
    observaciones_baja,
    evidencia_url,
    tiempo_uso
  } = value;
  const evidenciasTemporalesProcesadas = parseImagenesTemporales(
    req.body.evidencia_imagenes
  );

  let connection;

  try {
    const fechaNormalizada = formatearFecha(fecha_diagnostico) || null;
    const procesadorTexto = (procesador || incidencia.procesador || '').trim();
    const memoriaTexto = (memoria_ram || incidencia.memoria_ram || '').trim();
    const almacenamientoTexto = (almacenamiento || incidencia.almacenamiento || '').trim();
    const evidenciaTexto = (evidencia_url || '').trim();

    const segmentosTiempoUso = [];
    const tiempoUsoLibre = String(tiempo_uso ?? '').trim();
    if (tiempoUsoLibre) {
      segmentosTiempoUso.push(`Tiempo de uso: ${tiempoUsoLibre}`);
    }
    if (descripcion_trabajo?.trim()) {
      segmentosTiempoUso.push(descripcion_trabajo.trim());
    }
    if (requiere_baja === 'SI') {
      if (motivo_baja?.trim()) {
        segmentosTiempoUso.push(`Motivo: ${motivo_baja.trim()}`);
      }
      if (autorizado_por?.trim()) {
        segmentosTiempoUso.push(`Autorizado por: ${autorizado_por.trim()}`);
      }
      if (observaciones_baja?.trim()) {
        segmentosTiempoUso.push(`Observaciones: ${observaciones_baja.trim()}`);
      }
    }

    const tiempoUsoTexto = segmentosTiempoUso.join('\n');

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [resultado] = await connection.query(
      `INSERT INTO diagnostico (
         id_activo,
         id_incidencia,
         id_usuario_tecnico,
         diagnostico,
         fecha_diagnostico,
         tiempo_uso,
         procesador,
         memoria_ram,
         almacenamiento,
         evidenciaURL
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incidencia.id_activo,
        idIncidencia,
        tecnicoId,
        diagnostico,
        fechaNormalizada,
        tiempoUsoTexto,
        procesadorTexto,
        memoriaTexto,
        almacenamientoTexto,
        evidenciaTexto
      ]
    );

    const diagnosticoId = resultado.insertId;

    let reporteBajaUrl = null;
    let reporteBajaCreado = null;
    if (requiere_baja === 'SI') {
      if (!incidencia.id_activo) {
        throw new Error('El activo asociado a la incidencia es obligatorio para generar el reporte de baja.');
      }

      const fechaBaja = fechaNormalizada || formatearFecha(new Date()) || null;
      const [resultadoBaja] = await connection.query(
        `INSERT INTO reportesbaja (
           ID_Activo,
           Fecha_Baja,
           id_diagnostico
         ) VALUES (?, ?, ?)`,
        [incidencia.id_activo, fechaBaja, diagnosticoId]
      );

      if (incidencia.id_activo !== null && incidencia.id_activo !== undefined) {
        await connection.query(
          `UPDATE activos_fijos
              SET estado = ?
            WHERE id_activo = ?
            LIMIT 1`,
          ['BAJA', incidencia.id_activo]
        );
      }
      const bajaId = resultadoBaja?.insertId;
      reporteBajaUrl = `/incidencias/${idIncidencia}/diagnostico/baja/pdf/${diagnosticoId}`;
      if (bajaId) {
        reporteBajaCreado = {
          id: bajaId,
          fecha: fechaBaja
        };
      }
    }

    await connection.commit();

    try {
      await guardarEvidenciasTemporales(diagnosticoId, evidenciasTemporalesProcesadas);
    } catch (evidenciaError) {
      console.error('No se pudieron guardar las evidencias temporales:', evidenciaError);
    }

    if (!req.session.diagnosticSignatures) {
      req.session.diagnosticSignatures = {};
    }

    req.session.diagnosticSignatures[String(diagnosticoId)] = firma_tecnico;

    const queryParams = new URLSearchParams({ ok: '1', h: String(diagnosticoId) });
    if (reporteBajaUrl) {
      queryParams.set('b', reporteBajaUrl);
      if (reporteBajaCreado?.id) {
        queryParams.set('bid', String(reporteBajaCreado.id));
      }
      if (reporteBajaCreado?.fecha) {
        queryParams.set('bf', reporteBajaCreado.fecha);
      }
    }

    return res.redirect(`/incidencias/${idIncidencia}/diagnostico?${queryParams.toString()}`);
  } catch (errorGuardado) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error al revertir la transacción de diagnóstico:', rollbackError);
      }
    }

    console.error('Error al guardar diagnóstico:', errorGuardado);
    try {
      const diagnosticos = await obtenerDiagnosticosIncidencia(idIncidencia);
      const nombreTecnico = [req.session.user?.nombre, req.session.user?.apellido]
        .filter(Boolean)
        .join(' ');

      return res.status(500).render('incidencias/diagnostico', {
        incidencia,
        diagnosticos,
        errores: ['Ocurrió un error al guardar el diagnóstico. Inténtalo nuevamente.'],
        values: normalizarValoresDiagnostico(req.body, nombreTecnico),
        ok: false,
        diagnosticoIdCreado: null,
        reporteBajaCreado: null,
        pageTitle,
        estados: ESTADOS,
        permiteDiagnostico,
        estadoActualizado: false,
        estadoError: false,
        evidenciaConfig
      });
    } catch (diagnosticoError) {
      console.error('Error adicional al recuperar diagnósticos:', diagnosticoError);
      return res.status(500).send('Error grave al guardar el diagnóstico.');
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const getDiagnosticoPdf = async (req, res) => {
  const idIncidencia = Number(req.params.id);
  const idDiagnostico = Number(req.params.diagnosticoId);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  if (!Number.isInteger(idDiagnostico) || idDiagnostico <= 0) {
    return res.status(404).send('Registro de diagnóstico no encontrado');
  }

  try {
    const camposActivo = await construirSelectEspecificacionesActivo('a', 'activo');

    const [rows] = await pool.query(
      `SELECT
         d.id_diagnostico,
         d.tiempo_uso,
         d.diagnostico AS diagnostico_tecnico,
         d.fecha_diagnostico,
         d.creado_en,
         d.procesador AS diagnostico_procesador,
         d.memoria_ram AS diagnostico_memoria_ram,
         d.almacenamiento AS diagnostico_almacenamiento,
         d.evidenciaURL AS diagnostico_evidencia,
         i.id_incidencia,
         i.descripcion_problema,
         i.tipo_incidencia,
         i.origen_incidencia,
         i.prioridad,
         i.estado,
        COALESCE(
          NULLIF(i.nombre_contacto_externo, ''),
          NULLIF(a.propietario_nombre_completo, ''),
          CONCAT_WS(' ', u.nombre, u.apellido)
        ) AS nombre_propietario_externo,
        i.nombre_contacto_externo,
         i.tipo_contacto_externo,
         i.datos_contacto_externo,
         i.creada_en AS incidencia_creada_en,
         a.marca,
         a.modelo,
         a.numero_serie,
         a.placa_activo,
         a.propietario_nombre_completo,
         a.propietario_contacto,
         a.fecha_garantia,
         a.id_categoria_activos,
         ${camposActivo.join(',\n         ')},
         ar.nombre_area AS area_nombre,
         dpt.nombre_departamento AS departamento_nombre,
         cat.nombre AS categoria_nombre,
        CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_reporta,
        CONCAT_WS(' ', ut.nombre, ut.apellido) AS nombre_tecnico,
        ut.correo AS correo_tecnico
       FROM diagnostico d
       INNER JOIN incidencias i ON i.id_incidencia = d.id_incidencia
       INNER JOIN activos_fijos a ON a.id_activo = d.id_activo
       LEFT JOIN areas ar ON ar.id_area = a.id_area
       LEFT JOIN departamentos dpt ON dpt.id_departamento = ar.id_departamento
       LEFT JOIN categorias_activos cat ON cat.id_categoria_activos = a.id_categoria_activos
       LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN usuarios ut ON ut.id_usuario = d.id_usuario_tecnico
       WHERE d.id_diagnostico = ? AND d.id_incidencia = ?
       LIMIT 1`,
      [idDiagnostico, idIncidencia]
    );

    const registro = rows[0];

    if (!registro) {
      return res.status(404).send('El diagnóstico solicitado no existe.');
    }

    const detalles = descomponerTiempoUso(registro.tiempo_uso);
    const contactoReporte =
      construirContactoReporte({ ...registro, usuario_reporta: registro.nombre_reporta }) ||
      'No registrado';
    const tipoContacto = obtenerTextoPlano(registro.tipo_contacto_externo) || 'No aplica';
    const datosContacto = obtenerTextoPlano(registro.datos_contacto_externo) || 'No registrados';
    const evidenciaImagenes = await obtenerEvidenciasTemporales(idDiagnostico);

    const firmasSesion = req.session.diagnosticSignatures || {};
    const firmaSesion = firmasSesion[String(idDiagnostico)];
    if (firmaSesion) {
      delete firmasSesion[String(idDiagnostico)];
    }
    req.session.diagnosticSignatures = firmasSesion;

    const firma = firmaSesion || registro.nombre_tecnico || 'Firma no registrada';
    const solicitarDescarga = String(req.query.descargar ?? '')
      .trim()
      .toLowerCase();
    const esDescarga = ['1', 'true', 'si', 'yes'].includes(solicitarDescarga);

    generarDiagnosticoPdf({
      res,
      registro,
      detalles,
      contactoReporte,
      tipoContacto,
      datosContacto,
      firma,
      esDescarga,
      formatearFechaLarga,
      evidenciaImagenes
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return res.status(500).send('No se pudo generar el PDF del diagnóstico.');
  }
};

export const getDiagnosticoBajaPdf = async (req, res) => {
  const idIncidencia = Number(req.params.id);
  const idDiagnostico = Number(req.params.diagnosticoId);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  if (!Number.isInteger(idDiagnostico) || idDiagnostico <= 0) {
    return res.status(404).send('Registro de diagnóstico no encontrado');
  }

  try {
    const camposActivo = await construirSelectEspecificacionesActivo('a', 'activo');

    const [rows] = await pool.query(
      `SELECT
         d.id_diagnostico,
         d.tiempo_uso,
         d.diagnostico AS diagnostico_tecnico,
         d.fecha_diagnostico,
         d.procesador AS diagnostico_procesador,
         d.memoria_ram AS diagnostico_memoria_ram,
         d.almacenamiento AS diagnostico_almacenamiento,
         d.evidenciaURL AS diagnostico_evidencia,
         i.id_incidencia,
         i.descripcion_problema,
         i.tipo_incidencia,
         i.origen_incidencia,
         i.prioridad,
         i.estado,
        COALESCE(
          NULLIF(i.nombre_contacto_externo, ''),
          NULLIF(a.propietario_nombre_completo, ''),
          CONCAT_WS(' ', u.nombre, u.apellido)
        ) AS nombre_propietario_externo,
        i.nombre_contacto_externo,
         i.tipo_contacto_externo,
         i.datos_contacto_externo,
         a.marca,
         a.modelo,
         a.numero_serie,
         a.placa_activo,
         a.propietario_nombre_completo,
         a.propietario_contacto,
         a.fecha_compra,
         a.fecha_garantia,
         a.id_categoria_activos,
         ${camposActivo.join(',\n         ')},
         ar.nombre_area AS area_nombre,
         dpt.nombre_departamento AS departamento_nombre,
         cat.nombre AS categoria_nombre,
         b.ID_Baja AS baja_id,
         b.Fecha_Baja AS baja_fecha,
         b.Fecha_Reimpresion AS baja_fecha_reimpresion,
         CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_reporta,
         CONCAT_WS(' ', ut.nombre, ut.apellido) AS nombre_tecnico
       FROM diagnostico d
       INNER JOIN incidencias i ON i.id_incidencia = d.id_incidencia
       INNER JOIN activos_fijos a ON a.id_activo = d.id_activo
       LEFT JOIN areas ar ON ar.id_area = a.id_area
       LEFT JOIN departamentos dpt ON dpt.id_departamento = ar.id_departamento
       LEFT JOIN categorias_activos cat ON cat.id_categoria_activos = a.id_categoria_activos
       LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN usuarios ut ON ut.id_usuario = d.id_usuario_tecnico
       INNER JOIN reportesbaja b ON b.id_diagnostico = d.id_diagnostico
       WHERE d.id_diagnostico = ? AND d.id_incidencia = ?
       LIMIT 1`,
      [idDiagnostico, idIncidencia]
    );

    const registro = rows[0];

    if (!registro || !registro.baja_id) {
      return res.status(404).send('El reporte de baja solicitado no existe.');
    }

    const detalles = descomponerTiempoUso(registro.tiempo_uso);
    const contactoReporte =
      construirContactoReporte({ ...registro, usuario_reporta: registro.nombre_reporta }) ||
      'No registrado';
    const tipoContacto = obtenerTextoPlano(registro.tipo_contacto_externo) || 'No aplica';
    const datosContacto = obtenerTextoPlano(registro.datos_contacto_externo) || 'No registrados';
    const solicitarDescarga = String(req.query.descargar ?? '')
      .trim()
      .toLowerCase();
    const esDescarga = ['1', 'true', 'si', 'yes'].includes(solicitarDescarga);
    const evidenciaImagenes = await obtenerEvidenciasTemporales(idDiagnostico);

    generarBajaPdf({
      res,
      registro,
      detalles,
      contactoReporte,
      tipoContacto,
      datosContacto,
      esDescarga,
      formatearFechaLarga,
      evidenciaImagenes
    });
  } catch (error) {
    console.error('Error al generar PDF de baja:', error);
    return res.status(500).send('No se pudo generar el PDF de baja.');
  }
};
