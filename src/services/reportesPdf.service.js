import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

const LOGO_PATH = path.join(process.cwd(), 'public', 'img', 'logo_reporte.png');
const PUESTO_TECNICO_DEFAULT = 'Ingieniero de Soporte de Hoteles';
const DIRECCION_HOTEL_XCARET_ARTE =
  'Hotel Xcaret Arte · Carretera Chetumal - Puerto Juárez Km. 282, Solidaridad, Q.Roo';

const agregarPaginaDescripcionGraficaYFirma = ({
  doc,
  drawDocumentHeader,
  drawSectionTitle,
  drawLabeledBox,
  startX,
  pageWidth,
  encabezado,
  tituloDescripcion,
  contenidoDescripcion,
  datosTecnico = {}
}) => {
  const {
    nombreTecnico = 'Nombre del técnico no registrado',
    departamentoTecnico = 'Departamento no registrado',
    correoTecnico = 'Correo no registrado',
    puestoTecnico = PUESTO_TECNICO_DEFAULT,
    direccionHotel = DIRECCION_HOTEL_XCARET_ARTE
  } = datosTecnico;

  doc.addPage();
  doc.y = doc.page.margins.top;
  drawDocumentHeader(encabezado);

  drawSectionTitle(tituloDescripcion);
  drawLabeledBox(tituloDescripcion, contenidoDescripcion, { height: 150 });

  doc.moveDown(1.1);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Espacio para firma del técnico responsable', startX);

  doc.moveDown(0.9);
  const firmaLineWidth = Math.min(pageWidth * 0.65, 320);
  const firmaLineY = doc.y;

  doc
    .moveTo(startX, firmaLineY)
    .lineTo(startX + firmaLineWidth, firmaLineY)
    .lineWidth(0.9)
    .strokeColor('#000000')
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(9)
    .text('Firma del técnico', startX, firmaLineY + 4, {
      width: firmaLineWidth,
      align: 'center'
    });

  doc.moveDown(2);

  const infoLines = [
    `Nombre del técnico: ${nombreTecnico}`,
    `Departamento: ${departamentoTecnico}`,
    puestoTecnico,
    `Correo: ${correoTecnico}`,
    `Dirección: ${direccionHotel}`
  ];

  infoLines.forEach((linea) => {
    doc.font('Helvetica').fontSize(10).text(linea, startX, doc.y, {
      width: pageWidth,
      lineGap: 2
    });
    doc.moveDown(0.3);
  });
};

const valorSeguro = (valor, reemplazo = 'No registrado') => {
  if (valor === undefined || valor === null) {
    return reemplazo;
  }

  const texto = String(valor).trim();
  return texto.length > 0 ? texto : reemplazo;
};

const crearDocumentoBase = ({ res, nombreArchivo, esDescarga, titulo, asunto }) => {
  const doc = new PDFDocument({ margin: 40, size: 'LETTER' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${esDescarga ? 'attachment' : 'inline'}; filename="${nombreArchivo}"`
  );

  doc.info.Title = titulo;
  doc.info.Subject = asunto;
  doc.info.Creator = 'Sistema de Control de Activos';
  doc.pipe(res);

  return doc;
};

const construirUtilidadesLayout = (doc) => {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;

  // 3 columnas (ya lo usabas)
  const thirdWidth = Math.floor(pageWidth / 3);
  const columnWidthsThree = [thirdWidth, thirdWidth, pageWidth - thirdWidth * 2];

  // 4 columnas (ya lo usabas)
  const quarterWidth = Math.floor(pageWidth / 4);
  const columnWidthsFour = [
    quarterWidth,
    quarterWidth,
    quarterWidth,
    pageWidth - quarterWidth * 3
  ];
  const columnWidthsEspecificos = [...columnWidthsFour];

  // NUEVO: 2 columnas tipo “Etiqueta / Valor” como en el formato físico
  const halfWidth = Math.floor(pageWidth / 2);
  const columnWidthsTwo = [halfWidth, pageWidth - halfWidth];

  const drawSectionTitle = (titulo) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#1f1f1f')
      .text(titulo.toUpperCase(), startX);

    doc.moveDown(0.35);

    doc
      .strokeColor('#1f1f1f')
      .lineWidth(1)
      .moveTo(startX, doc.y)
      .lineTo(startX + pageWidth, doc.y)
      .stroke();

    doc.moveDown(0.4);
    doc.strokeColor('#000000').lineWidth(1);
  };

  const drawKeyValueTable = (filas, columnWidths) => {
    const rowHeight = 60; // si lo quieres más “pegado”, puedes bajar esto a 40
    const padding = 8;
    let y = doc.y;

    filas.forEach((fila) => {
      let currentX = startX;

      fila.forEach((dato, index) => {
        const cellWidth = columnWidths[index];
        if (!cellWidth) return;

        doc
          .rect(currentX, y, cellWidth, rowHeight)
          .strokeColor('#e0e0e0')
          .stroke();

        const labelHeight = dato.label ? 11 : 0;
        let textY = y + padding;

        if (dato.label) {
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#424242');
          doc.text(dato.label.toUpperCase(), currentX + padding, textY, {
            width: cellWidth - padding * 2,
            lineGap: 1
          });
          textY += labelHeight + 2;
        }

        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#000000');
        doc.text(dato.value, currentX + padding, textY, {
          width: cellWidth - padding * 2,
          lineGap: 1.5
        });

        currentX += cellWidth;
      });

      y += rowHeight;
    });

    doc.strokeColor('#000000');
    doc.fillColor('#000000');
    doc.y = y + 10;
  };

  // MEJORADO: cajas tipo “Descripción gráfica / Diagnóstico técnico”
  const drawLabeledBox = (titulo, contenido, opciones = {}) => {
    const paddingH = 10;
    const paddingV = 10;
    const minHeightBase = opciones.height ?? 120;
    const maxY = doc.page.height - doc.page.margins.bottom;
    const initialY = doc.y;

    // Medimos el espacio requerido antes de dibujar para evitar que se corte la caja
    doc.font('Helvetica-Bold').fontSize(10);
    const tituloHeight = doc.heightOfString(titulo, { width: pageWidth });

    doc.font('Helvetica').fontSize(10);
    const textHeight = doc.heightOfString(contenido, {
      width: pageWidth - paddingH * 2,
      lineGap: 3
    });

    const boxHeight = Math.max(minHeightBase, textHeight + paddingV * 2);
    const totalHeightNecesario = tituloHeight + 6 + boxHeight + 14;

    if (initialY + totalHeightNecesario > maxY) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }

    const boxY = doc.y;

    // Título de la caja
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#000000')
      .text(titulo, startX, boxY);
    const contentY = doc.y + 6;

    // Rectángulo
    doc
      .rect(startX, contentY, pageWidth, boxHeight)
      .strokeColor('#bdbdbd')
      .stroke();
    doc.strokeColor('#000000');

    // Texto dentro de la caja
    doc.font('Helvetica').fontSize(10).text(contenido, startX + paddingH, contentY + paddingV, {
      width: pageWidth - paddingH * 2,
      lineGap: 3
    });

    // Dejamos espacio debajo de la caja
    doc.y = contentY + boxHeight + 14;
  };

  const drawDocumentHeader = (titulo) => {
    const initialY = doc.y;
    let headerX = startX;
    let availableWidth = pageWidth;
    let headerBottom = initialY;
    const espacioLogoTitulos = Math.max(6, pageWidth * 0.02);

    if (fs.existsSync(LOGO_PATH)) {
      try {
        const logoImage = doc.openImage(LOGO_PATH);
        const maxLogoWidth = Math.min(120, pageWidth * 0.28);
        const logoWidth = Math.min(maxLogoWidth, logoImage.width);
        const logoHeight = (logoImage.height / logoImage.width) * logoWidth;

        doc.image(logoImage, startX, initialY, { width: logoWidth });

        headerX = startX + logoWidth + espacioLogoTitulos;
        availableWidth = Math.max(pageWidth - (headerX - startX), pageWidth * 0.45);
        headerBottom = Math.max(headerBottom, initialY + logoHeight);
      } catch (logoError) {
        console.error('No se pudo cargar el logo del reporte:', logoError);
      }
    }

    const headerTextOptions = { width: availableWidth, align: 'left' };

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#1f1f1f');
    doc.text('DIRECCIÓN DE TECNOLOGÍA', headerX, initialY, {
      ...headerTextOptions,
      lineGap: 1
    });

    doc.moveDown(0.1);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f1f1f');
    doc.text('SISTEMAS · SOPORTE TÉCNICO', headerX, doc.y, {
      ...headerTextOptions,
      lineGap: 1
    });

    doc.moveDown(0.15);
    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#000000');
    doc.text(titulo, headerX, doc.y, headerTextOptions);

    headerBottom = Math.max(headerBottom, doc.y);
    doc.y = headerBottom + 10;
    doc.fillColor('#000000');
  };

  return {
    pageWidth,
    startX,
    columnWidthsTwo,       // <- NUEVO
    columnWidthsThree,
    columnWidthsFour,
    columnWidthsEspecificos,
    drawSectionTitle,
    drawKeyValueTable,
    drawLabeledBox,
    drawDocumentHeader
  };
};


export const generarDiagnosticoPdf = ({
  res,
  registro,
  detalles,
  contactoReporte,
  tipoContacto,
  datosContacto,
  firma,
  esDescarga,
  formatearFechaLarga
}) => {
  const nombreArchivo = `diagnostico_incidencia_${registro.id_incidencia}.pdf`;
  const doc = crearDocumentoBase({
    res,
    nombreArchivo,
    esDescarga,
    titulo: `Diagnóstico incidencia ${registro.id_incidencia}`,
    asunto: 'Formato de diagnóstico de equipo de cómputo'
  });

  const {
    pageWidth,
    startX,
    columnWidthsTwo,
    columnWidthsThree,
    columnWidthsFour,
    columnWidthsEspecificos,
    drawSectionTitle,
    drawKeyValueTable,
    drawLabeledBox,
    drawDocumentHeader
  } = construirUtilidadesLayout(doc);

  const nombreActivo =
    registro.marca || registro.modelo
      ? [registro.marca, registro.modelo].filter(Boolean).join(' ')
      : 'Activo sin nombre';

  const categoriaTexto = registro.categoria_nombre || 'No registrada';

  const esEquipoComputo = /cpu|laptop|pc/i.test(String(registro.categoria_nombre ?? ''));

  const especificaciones = esEquipoComputo
    ? {
        procesador:
          registro.diagnostico_procesador ||
          registro.activo_procesador ||
          'No registrado',
        memoria_ram:
          registro.diagnostico_memoria_ram ||
          registro.activo_memoria_ram ||
          'No registrada',
        almacenamiento:
          registro.diagnostico_almacenamiento ||
          registro.activo_almacenamiento ||
          'No registrado'
      }
    : {
        procesador: 'No aplica',
        memoria_ram: 'No aplica',
        almacenamiento: 'No aplica'
      };

  const garantiaTexto = formatearFechaLarga?.(registro.fecha_garantia) || 'No registrada';

  const propietario = valorSeguro(
    registro.propietario_nombre_completo,
    'No registrado'
  );
  const contactoPropietario = valorSeguro(
    registro.propietario_contacto,
    'No registrado'
  );
  const fechaReporte =
    formatearFechaLarga?.(registro.incidencia_creada_en) || 'No registrada';

  // Tiempo de uso (opcional) para que se parezca al formato
  const tiempoUsoTexto = (() => {
    if (detalles?.tiempoUso) return detalles.tiempoUso;

    const linea = String(registro.tiempo_uso ?? '')
      .split(/\r?\n/)
      .map((p) => p.trim())
      .find(Boolean);

    return valorSeguro(linea, 'No registrado');
  })();

  // ==== ENCABEZADO ====
  drawDocumentHeader('Formato de Diagnóstico de Equipo de Cómputo');

  // ==== TABLA SUPERIOR (Área / Fecha / Departamento / Usuario) ====
  drawKeyValueTable(
    [
      [
        { label: 'Área', value: registro.area_nombre || 'No registrada' },
        {
          label: 'Fecha',
          value:
            formatearFechaLarga?.(registro.fecha_diagnostico) || 'No registrada'
        }
      ],
      [
        {
          label: 'Departamento',
          value: registro.departamento_nombre || 'No registrado'
        },
        { label: '', value: '' }
      ],
      [
        { label: 'Usuario', value: propietario },
        { label: '', value: '' }
      ]
    ],
    columnWidthsTwo
  );

  // ==== DATOS DEL EQUIPO (tabla similar al formato) ====
  drawSectionTitle('Datos del equipo');
  drawKeyValueTable(
    [
      [
        {
          label: 'Equipo',
          value: nombreActivo || categoriaTexto || 'Activo sin nombre'
        },
        { label: 'Marca', value: registro.marca || 'No registrada' }
      ],
      [
        { label: 'Modelo', value: registro.modelo || 'No registrado' },
        { label: 'Placa de AF', value: registro.placa_activo || 'No registrada' }
      ],
      [
        { label: 'No. serie', value: registro.numero_serie || 'No registrado' },
        { label: 'Tiempo de uso', value: tiempoUsoTexto }
      ],
      [
        { label: 'Nombre de equipo', value: nombreActivo },
        { label: '', value: '' }
      ]
    ],
    columnWidthsTwo
  );

  // ==== DATOS ESPECÍFICOS (se mantiene parecido) ====
  drawSectionTitle('Datos específicos');
  drawKeyValueTable(
    [
      [
        { label: 'Procesador', value: especificaciones.procesador },
        { label: 'Memoria RAM', value: especificaciones.memoria_ram },
        { label: 'Almacenamiento', value: especificaciones.almacenamiento },
        { label: 'Garantía', value: garantiaTexto }
      ]
    ],
    columnWidthsEspecificos
  );

  // ==== DESCRIPCIÓN GRÁFICA (caja grande tipo formato) ====
  const evidenciaTexto = registro.diagnostico_evidencia
    ? `Evidencia: ${registro.diagnostico_evidencia}`
    : 'No se proporcionó evidencia gráfica para este diagnóstico.';

  // ==== DIAGNÓSTICO TÉCNICO (caja grande) ====
  const partesDiagnostico = [];

  if (registro.descripcion_problema) {
    partesDiagnostico.push(
      `Descripción del problema: ${registro.descripcion_problema}`
    );
  }

  if (detalles?.trabajo) {
    partesDiagnostico.push(`Trabajo realizado: ${detalles.trabajo}`);
  }

  if (detalles?.motivo) {
    partesDiagnostico.push(`Motivo: ${detalles.motivo}`);
  }

  if (detalles?.observaciones) {
    partesDiagnostico.push(`Observaciones: ${detalles.observaciones}`);
  }

  if (registro.diagnostico_tecnico) {
    partesDiagnostico.push(`Diagnóstico final: ${registro.diagnostico_tecnico}`);
  }

  const diagnosticoCompleto =
    partesDiagnostico.join('\n\n') || 'Sin información registrada.';

  drawLabeledBox('Diagnóstico técnico', diagnosticoCompleto, { height: 160 });

  const nombreTecnico = valorSeguro(
    registro.nombre_tecnico,
    'Nombre del técnico no registrado'
  );
  const correoTecnico = valorSeguro(
    registro.correo_tecnico,
    'Correo no registrado'
  );
  const departamentoTecnico = valorSeguro(
    registro.departamento_nombre,
    'Departamento no registrado'
  );

  agregarPaginaDescripcionGraficaYFirma({
    doc,
    drawDocumentHeader,
    drawSectionTitle,
    drawLabeledBox,
    startX,
    pageWidth,
    encabezado: 'Formato de Diagnóstico de Equipo de Cómputo',
    tituloDescripcion: 'Descripción gráfica',
    contenidoDescripcion: evidenciaTexto,
    datosTecnico: {
      nombreTecnico,
      departamentoTecnico,
      correoTecnico
    }
  });

  doc.moveDown(1.2);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#555555')
    .text(
      'Documento generado automáticamente por el Sistema de Control de Activos.',
      startX,
      doc.y,
      { width: pageWidth, align: 'center' }
    );
  doc.fillColor('#000000');

  doc.end();
};


export const generarBajaPdf = ({
  res,
  registro,
  detalles,
  contactoReporte,
  tipoContacto,
  datosContacto,
  esDescarga,
  formatearFechaLarga
}) => {
  const nombreArchivo = `baja_activo_${registro.id_incidencia}_${registro.baja_id}.pdf`;
  const doc = crearDocumentoBase({
    res,
    nombreArchivo,
    esDescarga,
    titulo: `Reporte de baja #${registro.baja_id}`,
    asunto: 'Formato de baja de equipo de cómputo'
  });

  const {
    pageWidth,
    startX,
    columnWidthsThree,
    columnWidthsFour,
    columnWidthsEspecificos,
    drawSectionTitle,
    drawKeyValueTable,
    drawLabeledBox,
    drawDocumentHeader
  } = construirUtilidadesLayout(doc);

  const categoriaTexto = registro.categoria_nombre || 'No registrada';
  const esEquipoComputo = /cpu|laptop|pc/i.test(categoriaTexto || '');
  const especificaciones = esEquipoComputo
    ? {
        procesador: registro.diagnostico_procesador || registro.activo_procesador || 'N/A',
        memoria_ram: registro.diagnostico_memoria_ram || registro.activo_memoria_ram || 'N/A',
        almacenamiento: registro.diagnostico_almacenamiento || registro.activo_almacenamiento || 'N/A'
      }
    : {
        procesador: 'No aplica',
        memoria_ram: 'No aplica',
        almacenamiento: 'No aplica'
      };

  const propietario = valorSeguro(registro.propietario_nombre_completo, 'No registrado');
  const contactoPropietario = valorSeguro(registro.propietario_contacto, 'No registrado');
  const fechaSegura = (valor, reemplazo = 'No registrada') => formatearFechaLarga?.(valor) || reemplazo;
  const tiempoUsoTexto = (() => {
    if (detalles.tiempoUso) {
      return detalles.tiempoUso;
    }

    const linea = String(registro.tiempo_uso ?? '')
      .split(/\r?\n/)
      .map((parte) => parte.trim())
      .find(Boolean);

    return valorSeguro(linea, 'No registrado');
  })();

  const nombreEquipo = (() => {
    const combinado = [registro.marca, registro.modelo]
      .map((texto) => String(texto ?? '').trim())
      .filter(Boolean)
      .join(' ');
    if (combinado) return combinado;
    return valorSeguro(registro.categoria_nombre, 'No registrado');
  })();

  drawDocumentHeader('Formato de Baja de Equipo de Cómputo');

  drawSectionTitle('Datos generales');
  drawKeyValueTable(
    [
      [
        { label: 'Área', value: valorSeguro(registro.area_nombre, 'No registrada') },
        { label: 'Categoría', value: valorSeguro(registro.categoria_nombre, 'No registrada') },
        {
          label: 'Fecha de baja',
          value: fechaSegura(registro.baja_fecha, 'Sin fecha registrada')
        }
      ],
      [
        { label: 'Departamento', value: valorSeguro(registro.departamento_nombre, 'No registrado') },
        { label: 'Encargado de la categoría o activo', value: propietario },
        { label: 'Folio de incidencia', value: valorSeguro(registro.id_incidencia, 'Sin folio') }
      ],
      [
        { label: 'Prioridad', value: valorSeguro(registro.prioridad, 'Sin prioridad') },
        { label: 'Estado', value: valorSeguro(registro.estado, 'Sin estado') },
        { label: 'Origen', value: valorSeguro(registro.origen_incidencia, 'Sin origen') }
      ],
      [
        { label: 'Reportada por', value: valorSeguro(contactoReporte, 'No registrado') },
        { label: 'Tipo contacto externo', value: valorSeguro(tipoContacto, 'No aplica') },
        { label: 'Datos contacto externo', value: valorSeguro(datosContacto, 'No registrados') }
      ],
      [
        { label: 'ID de baja', value: valorSeguro(registro.baja_id, 'Sin ID') },
        {
          label: 'Fecha de reimpresión',
          value: fechaSegura(registro.baja_fecha_reimpresion, 'Sin fecha registrada')
        },
        { label: 'Tiempo de uso', value: tiempoUsoTexto }
      ]
    ],
    columnWidthsThree
  );

  drawSectionTitle('Datos del equipo');
  drawKeyValueTable(
    [
      [
        { label: 'Equipo', value: valorSeguro(registro.categoria_nombre, 'No registrado') },
        { label: 'Marca', value: valorSeguro(registro.marca, 'No registrada') },
        { label: 'Modelo', value: valorSeguro(registro.modelo, 'No registrado') },
        { label: 'Número de serie', value: valorSeguro(registro.numero_serie, 'No registrado') }
      ],
      [
        { label: 'Placa', value: valorSeguro(registro.placa_activo, 'No registrada') },
        { label: 'Propietario', value: propietario },
        { label: 'Contacto del propietario', value: contactoPropietario },
        { label: 'Nombre de equipo', value: nombreEquipo }
      ]
    ],
    columnWidthsFour
  );

  drawSectionTitle('Datos específicos');
  drawKeyValueTable(
    [
      [
        { label: 'Procesador', value: especificaciones.procesador },
        { label: 'Memoria RAM', value: especificaciones.memoria_ram },
        { label: 'Almacenamiento', value: especificaciones.almacenamiento },
        { label: 'Garantía', value: fechaSegura(registro.fecha_garantia, 'No registrada') }
      ]
    ],
    columnWidthsEspecificos
  );

  drawSectionTitle('Diagnóstico técnico');

  const escribirBloqueDiagnostico = (etiqueta, contenido) => {
    const texto = String(contenido ?? '').trim();
    if (!texto) return;

    doc.font('Helvetica-Bold').fontSize(10).text(`${etiqueta}:`);
    doc.font('Helvetica').fontSize(10).text(texto, {
      width: pageWidth,
      lineGap: 3
    });
    doc.moveDown(0.4);
  };

  escribirBloqueDiagnostico('Diagnóstico', registro.diagnostico_tecnico);
  escribirBloqueDiagnostico('Motivo de baja', detalles.motivo);
  escribirBloqueDiagnostico('Observaciones', detalles.observaciones);
  escribirBloqueDiagnostico('Autorizado por', detalles.autorizado_por);

  const descripcionGrafica = valorSeguro(
    registro.diagnostico_evidencia,
    'No se proporcionó descripción gráfica para esta baja.'
  );

  const nombreTecnico = valorSeguro(
    registro.nombre_tecnico,
    'Nombre del técnico no registrado'
  );
  const correoTecnico = valorSeguro(
    registro.correo_tecnico,
    'Correo no registrado'
  );
  const departamentoTecnico = valorSeguro(
    registro.departamento_nombre,
    'Departamento no registrado'
  );

  agregarPaginaDescripcionGraficaYFirma({
    doc,
    drawDocumentHeader,
    drawSectionTitle,
    drawLabeledBox,
    startX,
    pageWidth,
    encabezado: 'Formato de Baja de Equipo de Cómputo',
    tituloDescripcion: 'Descripción gráfica',
    contenidoDescripcion: descripcionGrafica,
    datosTecnico: {
      nombreTecnico,
      departamentoTecnico,
      correoTecnico
    }
  });

  doc.font('Helvetica').fontSize(9).fillColor('#555555').text(
    'Documento generado automáticamente por el Sistema de Control de Activos.',
    startX,
    doc.y,
    { width: pageWidth, align: 'center' }
  );
  doc.fillColor('#000000');

  doc.end();
};

