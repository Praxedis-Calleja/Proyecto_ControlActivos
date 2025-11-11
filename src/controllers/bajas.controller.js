import { pool } from '../db.js';
import { generarFolioBaja } from '../utils/folioBaja.js';

const formateadorFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

const formatearFecha = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return formateadorFecha.format(fecha);
};

let columnasReportesBaja;

const obtenerColumnasReportesBaja = async () => {
  if (columnasReportesBaja) return columnasReportesBaja;

  const [columnas] = await pool.query('SHOW COLUMNS FROM reportesbaja');
  columnasReportesBaja = new Set(
    columnas.map(({ Field }) => String(Field).toLowerCase())
  );

  return columnasReportesBaja;
};

const seleccionarColumnaBaja = (
  columnas,
  nombreColumna,
  alias,
  fallback = 'NULL'
) => {
  const existe = columnas.has(String(nombreColumna).toLowerCase());
  const expresion = existe ? `b.${nombreColumna}` : fallback;
  return `${expresion} AS ${alias}`;
};

const prepararBaja = (registro) => {
  const fechaBajaTexto = formatearFecha(registro.fecha_baja) || 'Sin fecha';
  const fechaDiagnosticoTexto =
    formatearFecha(registro.fecha_diagnostico) || 'Sin fecha';

  let motivo = registro.motivo;
  let observaciones = registro.observaciones;

  let tiempoUso = registro.tiempo_uso;

  if (registro.tiempo_uso) {
    const lineas = String(registro.tiempo_uso)
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    const lineasRestantes = [];

    for (const linea of lineas) {
      const lineaMin = linea.toLowerCase();
      if (!motivo && lineaMin.startsWith('motivo:')) {
        motivo = linea.slice('motivo:'.length).trim();
      } else if (!observaciones && lineaMin.startsWith('observaciones:')) {
        observaciones = linea.slice('observaciones:'.length).trim();
      } else {
        lineasRestantes.push(linea);
      }
    }

    if (!observaciones && lineasRestantes.length) {
      observaciones = lineasRestantes.join('\n');
    }

    tiempoUso = lineasRestantes.join('\n');
  }

  const nombreActivo = [registro.marca, registro.modelo]
    .map((parte) => (parte ? String(parte).trim() : ''))
    .filter(Boolean)
    .join(' ');

  return {
    id: registro.id_baja,
    folio: generarFolioBaja({
      folio: registro.folio,
      fechaBaja: registro.fecha_baja,
      idBaja: registro.id_baja
    }),
    fechaBajaTexto,
    fechaDiagnosticoTexto,
    autorizadoPor: registro.autorizado_por || 'No registrado',
    motivo: motivo || 'Sin motivo especificado',
    observaciones: observaciones || 'Sin observaciones',
    tiempoUso: tiempoUso || '',
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
    const columnasDisponibles = await obtenerColumnasReportesBaja();
    const columnaMotivo = seleccionarColumnaBaja(
      columnasDisponibles,
      'Motivo',
      'motivo'
    );
    const columnaFechaDiagnostico = seleccionarColumnaBaja(
      columnasDisponibles,
      'Fecha_Diagnostico',
      'fecha_diagnostico',
      'h.fecha_diagnostico'
    );
    const columnaObservaciones = seleccionarColumnaBaja(
      columnasDisponibles,
      'Observaciones',
      'observaciones'
    );
    const columnaAutorizadoPor = seleccionarColumnaBaja(
      columnasDisponibles,
      'AutorizadoPor',
      'autorizado_por'
    );

    const [rows] = await pool.query(
      `SELECT
         b.ID_Baja AS id_baja,
         b.ID_Activo AS id_activo,
         ${columnaAutorizadoPor},
         ${columnaMotivo},
         ${columnaFechaDiagnostico},
         b.Fecha_Baja AS fecha_baja,
         ${columnaObservaciones},
         b.EvidenciaURL AS evidencia_url,
         b.Folio AS folio,
         b.Tiempo_Uso AS tiempo_uso,
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
