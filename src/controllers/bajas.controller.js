import { pool } from '../db.js';

const formateadorFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

const formatearFecha = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return formateadorFecha.format(fecha);
};

const generarFolio = (registro) => {
  const folio = typeof registro.folio === 'string' ? registro.folio.trim() : '';
  if (folio) return folio;

  const fecha = registro.fecha_baja ? new Date(registro.fecha_baja) : null;
  const fechaTexto =
    fecha && !Number.isNaN(fecha.getTime())
      ? `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`
      : 'SINFECHA';

  const idTexto = String(registro.id_baja ?? '')
    .replace(/[^0-9]/g, '')
    .padStart(6, '0');

  return `BAJ-${fechaTexto}-${idTexto}`;
};

const prepararBaja = (registro) => {
  const fechaBajaTexto = formatearFecha(registro.fecha_baja) || 'Sin fecha';
  const fechaDiagnosticoTexto = formatearFecha(registro.fecha_diagnostico) || 'Sin fecha';

  const nombreActivo = [registro.marca, registro.modelo]
    .map((parte) => (parte ? String(parte).trim() : ''))
    .filter(Boolean)
    .join(' ');

  return {
    id: registro.id_baja,
    folio: generarFolio(registro),
    fechaBajaTexto,
    fechaDiagnosticoTexto,
    autorizadoPor: registro.autorizado_por || 'No registrado',
    motivo: registro.motivo || 'Sin motivo especificado',
    observaciones: registro.observaciones || 'Sin observaciones',
    elaboradoPor: registro.elaborado_por || 'No registrado',
    pdfUrl: registro.evidencia_url || null,
    diagnostico: registro.diagnostico || 'Sin diagnóstico capturado',
    incidencia: registro.id_incidencia
      ? {
          id: registro.id_incidencia,
          descripcion: registro.descripcion_problema || 'Sin descripción'
        }
      : null,
    activo: {
      id: registro.id_activo,
      nombre: nombreActivo || 'Activo sin nombre',
      numeroSerie: registro.numero_serie || 'No registrado',
      placa: registro.placa_activo || 'No registrada',
      categoria: registro.categoria || 'Sin categoría',
      area: registro.area || 'Sin área',
      departamento: registro.departamento || 'Sin departamento',
      propietario: registro.propietario || 'Sin propietario',
      contacto: registro.contacto || 'Sin contacto'
    }
  };
};

export const getBajas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         b.ID_Baja AS id_baja,
         b.ID_Activo AS id_activo,
         b.AutorizadoPor AS autorizado_por,
         b.Motivo AS motivo,
         b.Fecha_Diagnostico AS fecha_diagnostico,
         b.Fecha_Baja AS fecha_baja,
         b.Observaciones AS observaciones,
         b.EvidenciaURL AS evidencia_url,
         b.Folio AS folio,
         CONCAT_WS(' ', ut.nombre, ut.apellido) AS elaborado_por,
         a.marca,
         a.modelo,
         a.numero_serie,
         a.placa_activo,
         a.propietario_nombre_completo AS propietario,
         a.propietario_contacto AS contacto,
         c.nombre AS categoria,
         ar.nombre_area AS area,
         d.nombre_departamento AS departamento,
         h.id_historial,
         h.diagnostico,
         i.id_incidencia,
         i.descripcion_problema
       FROM reportesbaja b
       INNER JOIN activos_fijos a ON a.id_activo = b.ID_Activo
       LEFT JOIN categorias_activos c ON c.id_categoria_activos = a.id_categoria_activos
       LEFT JOIN areas ar ON ar.id_area = a.id_area
       LEFT JOIN departamentos d ON d.id_departamento = ar.id_departamento
       LEFT JOIN usuarios ut ON ut.id_usuario = b.ElaboradoPor
       LEFT JOIN historial h ON h.id_activo = b.ID_Activo
         AND b.EvidenciaURL IS NOT NULL
         AND b.EvidenciaURL = CONCAT('/incidencias/', h.id_incidencia, '/diagnostico/baja/pdf/', h.id_historial)
       LEFT JOIN incidencias i ON i.id_incidencia = h.id_incidencia
       ORDER BY b.Fecha_Baja DESC, b.ID_Baja DESC`
    );

    const bajas = rows.map(prepararBaja);

    return res.render('bajas/index', {
      bajas,
      error: null
    });
  } catch (error) {
    console.error('Error al obtener reportes de baja:', error);
    return res.status(500).render('bajas/index', {
      bajas: [],
      error: 'No se pudieron cargar los reportes de baja. Inténtalo nuevamente más tarde.'
    });
  }
};
