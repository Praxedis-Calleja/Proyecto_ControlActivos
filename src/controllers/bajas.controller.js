import { pool } from '../db.js';
import { generarFolioBaja } from '../utils/folioBaja.js';

const formateadorFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

const formatearFecha = (valor) => {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return formateadorFecha.format(fecha);
};

const descomponerTiempoUso = (valor) => {
  const lineas = String(valor ?? '')
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  let motivo = '';
  let observaciones = '';
  const trabajo = [];

  for (const linea of lineas) {
    const minusculas = linea.toLowerCase();
    if (!motivo && minusculas.startsWith('motivo:')) {
      motivo = linea.slice('motivo:'.length).trim();
    } else if (!observaciones && minusculas.startsWith('observaciones:')) {
      observaciones = linea.slice('observaciones:'.length).trim();
    } else if (!minusculas.startsWith('autorizado por:')) {
      trabajo.push(linea);
    }
  }

  return {
    trabajo: trabajo.join('\n'),
    motivo,
    observaciones
  };
};

const prepararBaja = (registro) => {
  const fechaBajaTexto = formatearFecha(registro.fecha_baja) || 'Sin fecha';
  const fechaDiagnosticoTexto =
    formatearFecha(registro.fecha_diagnostico) || 'Sin fecha';

  const detalles = descomponerTiempoUso(registro.tiempo_uso);

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
    motivo: detalles.motivo || 'Sin motivo especificado',
    observaciones: detalles.observaciones || 'Sin observaciones',
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
         b.Folio AS folio,
         b.Fecha_Baja AS fecha_baja,
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
       ORDER BY b.Fecha_Baja DESC, b.ID_Baja DESC`
    );

    const bajas = rows.map(prepararBaja);

    return res.render('bajas/index', {
      bajas,
      error: null,
      pageTitle: 'Reportes'
    });
  } catch (error) {
    console.error('Error al obtener reportes de baja:', error);
    return res.status(500).render('bajas/index', {
      bajas: [],
      error: 'No se pudieron cargar los reportes de baja. Inténtalo nuevamente más tarde.',
      pageTitle: 'Reportes'
    });
  }
};
