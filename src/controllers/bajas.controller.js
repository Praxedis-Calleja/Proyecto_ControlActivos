import { pool } from '../db.js';
import { generarFolioBaja } from '../utils/folioBaja.js';

const formateadorFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

const formatearFecha = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return formateadorFecha.format(fecha);
};

const dividirNotasBaja = (notas) => {
  const resultado = {
    motivo: '',
    autorizadoPor: '',
    observaciones: '',
    restantes: []
  };

  if (!notas) {
    return resultado;
  }

  const lineas = String(notas)
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  for (const linea of lineas) {
    const lineaMin = linea.toLowerCase();
    if (!resultado.motivo && lineaMin.startsWith('motivo:')) {
      resultado.motivo = linea.slice('motivo:'.length).trim();
    } else if (!resultado.autorizadoPor && lineaMin.startsWith('autorizado por:')) {
      resultado.autorizadoPor = linea.slice('autorizado por:'.length).trim();
    } else if (!resultado.observaciones && lineaMin.startsWith('observaciones:')) {
      resultado.observaciones = linea.slice('observaciones:'.length).trim();
    } else {
      resultado.restantes.push(linea);
    }
  }

  if (!resultado.observaciones && resultado.restantes.length) {
    resultado.observaciones = resultado.restantes.join('\n');
  }

  return resultado;
};

const prepararBaja = (registro) => {
  const fechaBajaTexto = formatearFecha(registro.fecha_baja) || 'Sin fecha';
  const fechaDiagnosticoTexto =
    formatearFecha(registro.fecha_diagnostico) || 'Sin fecha';

  const notas = dividirNotasBaja(registro.tiempo_uso);
  const motivo = registro.motivo || notas.motivo;
  const observaciones = registro.observaciones || notas.observaciones;
  const autorizadoPor = registro.autorizado_por || notas.autorizadoPor;
  const tiempoUso = notas.restantes.length
    ? notas.restantes.join('\n')
    : registro.tiempo_uso || '';

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
    autorizadoPor: autorizadoPor || 'No registrado',
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
    const [rows] = await pool.query(
      `SELECT
         b.ID_Baja AS id_baja,
         b.ID_Activo AS id_activo,
         NULL AS autorizado_por,
         NULL AS motivo,
         h.fecha_diagnostico AS fecha_diagnostico,
         b.Fecha_Baja AS fecha_baja,
         NULL AS observaciones,
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
       LEFT JOIN historial h ON h.id_activo = b.ID_Activo
         AND b.EvidenciaURL IS NOT NULL
         AND b.EvidenciaURL = CONCAT('/incidencias/', h.id_incidencia, '/diagnostico/baja/pdf/', h.id_historial)
       LEFT JOIN usuarios ut ON ut.id_usuario = h.id_usuario_tecnico
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
