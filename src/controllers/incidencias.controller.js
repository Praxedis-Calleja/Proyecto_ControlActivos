import Joi from 'joi';
import PDFDocument from 'pdfkit';
import { pool } from '../db.js';

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const ESTADOS = ['ABIERTA', 'EN_PROCESO', 'CERRADA', 'CANCELADA'];
const TIPOS_INCIDENCIA = ['CORRECTIVO', 'PREVENTIVO', 'INSTALACION', 'OTRO'];
const ORIGENES_INCIDENCIA = ['USUARIO', 'SISTEMA', 'MANTENIMIENTO', 'OTRO'];

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
  id_usuario: Joi.number().integer().required(),
  descripcion_problema: Joi.string().trim().min(10).required(),
  tipo_incidencia: Joi.string().valid(...TIPOS_INCIDENCIA).required(),
  origen_incidencia: Joi.string().valid(...ORIGENES_INCIDENCIA).required(),
  prioridad: Joi.string().valid(...PRIORIDADES).required(),
  estado: Joi.string().valid(...ESTADOS).required(),
  cerrada_en: Joi.alternatives().try(Joi.date(), Joi.string().valid('')).allow(null, '')
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

const normalizarValores = (datos = {}) => {
  const valores = { ...datos };
  let cerrada = valores.cerrada_en ?? '';

  if (typeof cerrada === 'string') {
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
    }
  }

  return {
    ...valores,
    cerrada_en: cerrada
  };
};

const normalizarValoresDiagnostico = (datos = {}, tecnicoActual = '') => ({
  descripcion_trabajo: datos.descripcion_trabajo ?? '',
  diagnostico: datos.diagnostico ?? '',
  fecha_diagnostico: datos.fecha_diagnostico
    ? String(datos.fecha_diagnostico).slice(0, 10)
    : '',
  firma_tecnico: datos.firma_tecnico ?? tecnicoActual,
  requiere_baja: datos.requiere_baja ?? 'NO',
  motivo_baja: datos.motivo_baja ?? '',
  autorizado_por: datos.autorizado_por ?? '',
  observaciones_baja: datos.observaciones_baja ?? '',
  evidencia_url: datos.evidencia_url ?? ''
});

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

const obtenerIncidenciaPorId = async (idIncidencia) => {
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
       a.marca,
       a.modelo,
       a.numero_serie,
       a.placa_activo,
       a.propietario_contacto,
       CONCAT_WS(' ', a.marca, a.modelo) AS activo_nombre,
       CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_reporta
     FROM incidencias i
     INNER JOIN activos_fijos a ON a.id_activo = i.id_activo
     LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
     WHERE i.id_incidencia = ?
     LIMIT 1`,
    [idIncidencia]
  );

  return rows[0] || null;
};

const obtenerHistorialIncidencia = async (idIncidencia) => {
  const [rows] = await pool.query(
    `SELECT
       h.id_historial,
       h.descripcion,
       h.diagnostico,
       h.fecha_diagnostico,
       h.creado_en,
       CONCAT_WS(' ', ut.nombre, ut.apellido) AS tecnico_nombre,
       b.ID_Baja AS baja_id,
       b.AutorizadoPor AS baja_autorizado_por,
       b.Fecha_Baja AS baja_fecha,
       b.EvidenciaURL AS baja_url
     FROM historial h
     LEFT JOIN usuarios ut ON ut.id_usuario = h.id_usuario_tecnico
     LEFT JOIN reportesbaja b ON b.ID_Activo = h.id_activo
       AND b.EvidenciaURL = CONCAT('/incidencias/', h.id_incidencia, '/diagnostico/baja/pdf/', h.id_historial)
     WHERE h.id_incidencia = ?
     ORDER BY h.creado_en DESC`,
    [idIncidencia]
  );

  return rows.map((registro) => ({
    ...registro,
    fecha_diagnostico_fmt: formatearFechaLarga(registro.fecha_diagnostico) || 'Sin fecha',
    creado_en_fmt: formatearFechaHoraCorta(registro.creado_en) || 'Sin fecha',
    reporte_baja: registro.baja_id
      ? {
          id: registro.baja_id,
          autorizado_por: registro.baja_autorizado_por || '',
          fecha_baja_fmt: formatearFechaLarga(registro.baja_fecha) || 'Sin fecha',
          url: registro.baja_url || ''
        }
      : null
  }));
};

export const getListadoIncidencias = async (req, res) => {
  try {
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
         COALESCE(h.total_diagnosticos, 0) AS total_diagnosticos,
         h.ultimo_diagnostico
       FROM incidencias i
       INNER JOIN activos_fijos a ON a.id_activo = i.id_activo
       LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN (
         SELECT id_incidencia, COUNT(*) AS total_diagnosticos, MAX(creado_en) AS ultimo_diagnostico
         FROM historial
         GROUP BY id_incidencia
       ) h ON h.id_incidencia = i.id_incidencia
       ORDER BY i.creada_en DESC`
    );

    const incidencias = rows.map((incidencia) => ({
      ...incidencia,
      creada_en_fmt: formatearFechaHoraCorta(incidencia.creada_en) || 'Sin fecha',
      ultimo_diagnostico_fmt: incidencia.ultimo_diagnostico
        ? formatearFechaHoraCorta(incidencia.ultimo_diagnostico)
        : '',
      descripcion_problema: incidencia.descripcion_problema || '',
      usuario_reporta: incidencia.usuario_reporta || 'No registrado',
      activo_nombre: incidencia.activo_nombre || 'Activo sin nombre',
      numero_serie: incidencia.numero_serie || '',
      placa_activo: incidencia.placa_activo || ''
    }));

    return res.render('incidencias/index', {
      incidencias,
      error: null
    });
  } catch (error) {
    console.error('Error al listar incidencias:', error);
    return res.status(500).render('incidencias/index', {
      incidencias: [],
      error: 'No se pudieron cargar las incidencias registradas. Intenta nuevamente más tarde.'
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
      ok: req.query.ok === '1'
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
      ok: false
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
        ok: false
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
      cerrada_en
    } = value;

    await pool.query(
      `INSERT INTO incidencias (
        descripcion_problema,
        estado,
        tipo_incidencia,
        origen_incidencia,
        prioridad,
        id_usuario,
        id_activo,
        cerrada_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        descripcion_problema,
        estado,
        tipo_incidencia,
        origen_incidencia,
        prioridad,
        id_usuario,
        id_activo,
        formatearFechaHora(cerrada_en)
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
        ok: false
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
        ok: false
      });
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

    const historial = await obtenerHistorialIncidencia(idIncidencia);
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

    const reporteBajaCreado =
      typeof req.query.b === 'string' && req.query.b.startsWith('/')
        ? req.query.b
        : null;

    return res.render('incidencias/diagnostico', {
      incidencia,
      historial,
      errores: [],
      values,
      ok: req.query.ok === '1',
      historialIdCreado:
        Number.isInteger(Number(req.query.h)) && Number(req.query.h) > 0
          ? Number(req.query.h)
          : null,
      reporteBajaCreado
    });
  } catch (error) {
    console.error('Error al cargar formulario de diagnóstico:', error);
    return res.status(500).send('Error al cargar el formulario de diagnóstico.');
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

  const { error, value } = esquemaDiagnostico.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    try {
      const historial = await obtenerHistorialIncidencia(idIncidencia);
      const nombreTecnico = [req.session.user?.nombre, req.session.user?.apellido]
        .filter(Boolean)
        .join(' ');

      return res.status(400).render('incidencias/diagnostico', {
        incidencia,
        historial,
        errores: error.details.map((detalle) => detalle.message),
        values: normalizarValoresDiagnostico(req.body, nombreTecnico),
        ok: false,
        historialIdCreado: null
      });
    } catch (historialError) {
      console.error('Error al recuperar historial:', historialError);
      return res.status(500).send('Error al validar el diagnóstico.');
    }
  }

  const {
    descripcion_trabajo,
    diagnostico,
    fecha_diagnostico,
    firma_tecnico,
    requiere_baja,
    motivo_baja,
    autorizado_por,
    observaciones_baja,
    evidencia_url
  } = value;

  let connection;

  try {
    const fechaNormalizada = formatearFecha(fecha_diagnostico) || null;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [resultado] = await connection.query(
      `INSERT INTO historial (
         id_activo,
         id_incidencia,
         id_usuario_tecnico,
         descripcion,
         diagnostico,
         fecha_diagnostico
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        incidencia.id_activo,
        idIncidencia,
        tecnicoId,
        descripcion_trabajo,
        diagnostico,
        fechaNormalizada
      ]
    );

    const historialId = resultado.insertId;

    let reporteBajaUrl = null;
    if (requiere_baja === 'SI') {
      const rutaPdf = `/incidencias/${idIncidencia}/diagnostico/baja/pdf/${historialId}`;
      const observacionesLimpias = [
        observaciones_baja?.trim() || '',
        evidencia_url ? `Evidencia: ${evidencia_url}` : '',
        `Diagnóstico relacionado #${historialId}`
      ]
        .filter(Boolean)
        .join('\n');

      const [existentes] = await connection.query(
        `SELECT ID_Baja
           FROM reportesbaja
          WHERE ID_Activo = ?
          LIMIT 1`,
        [incidencia.id_activo]
      );

      if (existentes.length) {
        await connection.query(
          `UPDATE reportesbaja
             SET ElaboradoPor = ?,
                 AutorizadoPor = ?,
                 Motivo = ?,
                 Fecha_Diagnostico = ?,
                 Observaciones = ?,
                 EvidenciaURL = ?
           WHERE ID_Baja = ?`,
          [
            tecnicoId,
            autorizado_por,
            motivo_baja,
            fechaNormalizada,
            observacionesLimpias || null,
            rutaPdf,
            existentes[0].ID_Baja
          ]
        );
      } else {
        await connection.query(
          `INSERT INTO reportesbaja (
             ID_Activo,
             ElaboradoPor,
             AutorizadoPor,
             Motivo,
             Fecha_Diagnostico,
             EvidenciaURL,
             Observaciones
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            incidencia.id_activo,
            tecnicoId,
            autorizado_por,
            motivo_baja,
            fechaNormalizada,
            rutaPdf,
            observacionesLimpias || null
          ]
        );
      }

      reporteBajaUrl = rutaPdf;
    }

    await connection.commit();

    if (!req.session.diagnosticSignatures) {
      req.session.diagnosticSignatures = {};
    }

    req.session.diagnosticSignatures[String(historialId)] = firma_tecnico;

    const queryParams = new URLSearchParams({ ok: '1', h: String(historialId) });
    if (reporteBajaUrl) {
      queryParams.set('b', reporteBajaUrl);
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
      const historial = await obtenerHistorialIncidencia(idIncidencia);
      const nombreTecnico = [req.session.user?.nombre, req.session.user?.apellido]
        .filter(Boolean)
        .join(' ');

      return res.status(500).render('incidencias/diagnostico', {
        incidencia,
        historial,
        errores: ['Ocurrió un error al guardar el diagnóstico. Inténtalo nuevamente.'],
        values: normalizarValoresDiagnostico(req.body, nombreTecnico),
        ok: false,
        historialIdCreado: null
      });
    } catch (historialError) {
      console.error('Error adicional al recuperar historial:', historialError);
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
  const idHistorial = Number(req.params.historialId);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  if (!Number.isInteger(idHistorial) || idHistorial <= 0) {
    return res.status(404).send('Registro de diagnóstico no encontrado');
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         h.id_historial,
         h.descripcion,
         h.diagnostico,
         h.fecha_diagnostico,
         h.creado_en,
         i.id_incidencia,
         i.descripcion_problema,
         i.tipo_incidencia,
         i.origen_incidencia,
         i.prioridad,
         i.estado,
         i.creada_en AS incidencia_creada_en,
         a.marca,
         a.modelo,
         a.numero_serie,
         a.placa_activo,
         a.propietario_contacto,
         CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_reporta,
         CONCAT_WS(' ', ut.nombre, ut.apellido) AS nombre_tecnico
       FROM historial h
       INNER JOIN incidencias i ON i.id_incidencia = h.id_incidencia
       INNER JOIN activos_fijos a ON a.id_activo = h.id_activo
       LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN usuarios ut ON ut.id_usuario = h.id_usuario_tecnico
       WHERE h.id_historial = ? AND h.id_incidencia = ?
       LIMIT 1`,
      [idHistorial, idIncidencia]
    );

    const registro = rows[0];

    if (!registro) {
      return res.status(404).send('El diagnóstico solicitado no existe.');
    }

    const firmasSesion = req.session.diagnosticSignatures || {};
    const firmaSesion = firmasSesion[String(idHistorial)];
    if (firmaSesion) {
      delete firmasSesion[String(idHistorial)];
    }
    req.session.diagnosticSignatures = firmasSesion;

    const firma = firmaSesion || registro.nombre_tecnico || 'Firma no registrada';

    const doc = new PDFDocument({ margin: 50 });
    const nombreArchivo = `diagnostico_incidencia_${registro.id_incidencia}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);

    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(18).text('Reporte de diagnóstico', {
      align: 'center'
    });

    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Datos de la incidencia');
    doc.font('Helvetica').fontSize(11);
    doc.text(`Incidencia #${registro.id_incidencia}`);
    doc.text(`Estado actual: ${registro.estado || 'Sin estado'}`);
    doc.text(`Prioridad: ${registro.prioridad || 'Sin prioridad'}`);
    doc.text(`Tipo: ${registro.tipo_incidencia || 'Sin tipo'}`);
    doc.text(`Origen: ${registro.origen_incidencia || 'Sin origen'}`);
    doc.text(`Reportada por: ${registro.nombre_reporta || 'No registrado'}`);
    doc.moveDown(0.5);
    doc.text('Descripción del problema:');
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').text(registro.descripcion_problema || 'Sin descripción');

    doc.moveDown();

    doc.font('Helvetica-Bold').text('Datos del activo');
    doc.font('Helvetica');
    const nombreActivo = (registro.marca || registro.modelo)
      ? [registro.marca, registro.modelo].filter(Boolean).join(' ')
      : 'Activo sin nombre';
    doc.text(`Activo: ${nombreActivo}`);
    doc.text(`Número de serie: ${registro.numero_serie || 'No registrado'}`);
    doc.text(`Placa: ${registro.placa_activo || 'No registrada'}`);
    doc.text(`Contacto propietario: ${registro.propietario_contacto || 'No registrado'}`);

    doc.moveDown();

    doc.font('Helvetica-Bold').text('Diagnóstico del técnico');
    doc.font('Helvetica');
    doc.text(`Fecha de diagnóstico: ${formatearFechaLarga(registro.fecha_diagnostico) || 'No registrada'}`);
    doc.moveDown(0.5);
    doc.text('Descripción del trabajo realizado:');
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').text(registro.descripcion || 'Sin información');
    doc.moveDown();
    doc.font('Helvetica').text('Diagnóstico final:');
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').text(registro.diagnostico || 'Sin información');

    doc.moveDown(2);
    doc.font('Helvetica-Bold').text('Firma del técnico:');
    doc.moveDown(0.7);
    doc.font('Helvetica').fontSize(14).text(firma);

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return res.status(500).send('No se pudo generar el PDF del diagnóstico.');
  }
};

export const getDiagnosticoBajaPdf = async (req, res) => {
  const idIncidencia = Number(req.params.id);
  const idHistorial = Number(req.params.historialId);

  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) {
    return res.status(404).send('Incidencia no encontrada');
  }

  if (!Number.isInteger(idHistorial) || idHistorial <= 0) {
    return res.status(404).send('Registro de diagnóstico no encontrado');
  }

  const rutaEsperada = `/incidencias/${idIncidencia}/diagnostico/baja/pdf/${idHistorial}`;

  try {
    const [rows] = await pool.query(
      `SELECT
         h.id_historial,
         h.descripcion,
         h.diagnostico,
         h.fecha_diagnostico,
         h.creado_en,
         i.id_incidencia,
         i.descripcion_problema,
         i.tipo_incidencia,
         i.origen_incidencia,
         i.prioridad,
         i.estado,
         i.creada_en AS incidencia_creada_en,
         a.marca,
         a.modelo,
         a.numero_serie,
         a.placa_activo,
         a.propietario_contacto,
         CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_reporta,
         CONCAT_WS(' ', ut.nombre, ut.apellido) AS nombre_tecnico,
         b.ID_Baja AS baja_id,
         b.AutorizadoPor AS baja_autorizado_por,
         b.Motivo AS baja_motivo,
         b.Fecha_Diagnostico AS baja_fecha_diagnostico,
         b.Fecha_Baja AS baja_fecha,
         b.Observaciones AS baja_observaciones,
         b.EvidenciaURL AS baja_url
       FROM historial h
       INNER JOIN incidencias i ON i.id_incidencia = h.id_incidencia
       INNER JOIN activos_fijos a ON a.id_activo = h.id_activo
       LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN usuarios ut ON ut.id_usuario = h.id_usuario_tecnico
       INNER JOIN reportesbaja b ON b.ID_Activo = h.id_activo AND b.EvidenciaURL = ?
       WHERE h.id_historial = ? AND h.id_incidencia = ?
       LIMIT 1`,
      [rutaEsperada, idHistorial, idIncidencia]
    );

    const registro = rows[0];

    if (!registro || !registro.baja_id) {
      return res.status(404).send('El reporte de baja solicitado no existe.');
    }

    const doc = new PDFDocument({ margin: 50 });
    const nombreArchivo = `baja_activo_${registro.id_incidencia}_${registro.baja_id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);

    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(18).text('Reporte de baja de activo', {
      align: 'center'
    });

    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Datos generales');
    doc.font('Helvetica').fontSize(11);
    doc.text(`Incidencia #${registro.id_incidencia}`);
    doc.text(`Estado de la incidencia: ${registro.estado || 'Sin estado'}`);
    doc.text(`Prioridad: ${registro.prioridad || 'Sin prioridad'}`);
    doc.text(`Tipo: ${registro.tipo_incidencia || 'Sin tipo'}`);
    doc.text(`Origen: ${registro.origen_incidencia || 'Sin origen'}`);
    doc.text(`Reportada por: ${registro.nombre_reporta || 'No registrado'}`);

    doc.moveDown();

    doc.font('Helvetica-Bold').text('Datos del activo');
    doc.font('Helvetica');
    const nombreActivo = (registro.marca || registro.modelo)
      ? [registro.marca, registro.modelo].filter(Boolean).join(' ')
      : 'Activo sin nombre';
    doc.text(`Activo: ${nombreActivo}`);
    doc.text(`Número de serie: ${registro.numero_serie || 'No registrado'}`);
    doc.text(`Placa: ${registro.placa_activo || 'No registrada'}`);
    doc.text(`Contacto propietario: ${registro.propietario_contacto || 'No registrado'}`);

    doc.moveDown();

    doc.font('Helvetica-Bold').text('Diagnóstico relacionado');
    doc.font('Helvetica');
    doc.text(
      `Fecha de diagnóstico: ${formatearFechaLarga(registro.fecha_diagnostico) || 'No registrada'}`
    );
    doc.moveDown(0.5);
    doc.text('Descripción del trabajo realizado:');
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').text(registro.descripcion || 'Sin información');
    doc.moveDown();
    doc.font('Helvetica').text('Diagnóstico final:');
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').text(registro.diagnostico || 'Sin información');

    doc.moveDown();

    doc.font('Helvetica-Bold').text('Detalles de la baja');
    doc.font('Helvetica');
    doc.text(
      `Fecha de baja: ${formatearFechaLarga(registro.baja_fecha) || 'No registrada'}`
    );
    doc.text(
      `Fecha del diagnóstico que originó la baja: ${
        formatearFechaLarga(registro.baja_fecha_diagnostico) || 'No registrada'
      }`
    );
    doc.text(`Autorizado por: ${registro.baja_autorizado_por || 'No registrado'}`);
    doc.moveDown(0.5);
    doc.text('Motivo de la baja:');
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').text(registro.baja_motivo || 'Sin motivo');
    doc.moveDown();
    doc.font('Helvetica').text('Observaciones:');
    doc.moveDown(0.2);
    doc.font('Helvetica-Oblique').text(registro.baja_observaciones || 'Sin observaciones');

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF de baja:', error);
    return res.status(500).send('No se pudo generar el reporte de baja.');
  }
};
