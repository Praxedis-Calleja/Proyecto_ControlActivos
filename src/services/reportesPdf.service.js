import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

const LOGO_PATH = path.join(process.cwd(), 'public', 'img', 'logo_reporte.png');
const PUESTO_TECNICO_DEFAULT = 'Ingeniero de Soporte HXA – Sistemas';
const DEPARTAMENTO_TECNICO_DEFAULT = 'Departamente de sistemas';
const DIRECCION_HOTEL_XCARET_ARTE =
  'Hotel Xcaret Arte · Carretera Chetumal - Puerto Juárez Km. 282, Solidaridad, Q.Roo';
const COLOR_ACCENT = '#a0192f';

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
  datosTecnico = {},
  opcionesEncabezado = {}
}) => {
  const {
    nombreTecnico = 'Nombre del técnico no registrado',
    departamentoTecnico = DEPARTAMENTO_TECNICO_DEFAULT,
    correoTecnico = 'Correo no registrado',
    puestoTecnico = PUESTO_TECNICO_DEFAULT,
    direccionHotel = DIRECCION_HOTEL_XCARET_ARTE
  } = datosTecnico;

  doc.addPage();
  doc.y = doc.page.margins.top;
  drawDocumentHeader(encabezado, opcionesEncabezado);

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

const textoOpcional = (valor) => {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto.length ? texto : null;
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

  const drawDocumentHeader = (titulo, opciones = {}) => {
    const {
      mostrarNombreHotel = false,
      direccionTitulo = 'DIRECCIÓN DE TECNOLOGÍA',
      tagline = 'SISTEMAS - SOPORTE TÉCNICO',
      alinearCentro = false
    } = opciones;
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

        if (!alinearCentro) {
          headerX = startX + logoWidth + espacioLogoTitulos;
          availableWidth = Math.max(pageWidth - (headerX - startX), pageWidth * 0.45);
        }
        headerBottom = Math.max(headerBottom, initialY + logoHeight);
      } catch (logoError) {
        console.error('No se pudo cargar el logo del reporte:', logoError);
      }
    }

    const headerTextOptions = {
      width: alinearCentro ? pageWidth : availableWidth,
      align: alinearCentro ? 'center' : 'left'
    };
    const textX = alinearCentro ? startX : headerX;

    if (mostrarNombreHotel) {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#1f1f1f');
      doc.text('Hotel Xcaret Arte', textX, initialY, headerTextOptions);
      doc.moveDown(0.15);
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#1f1f1f');
    doc.text(direccionTitulo, textX, doc.y, {
      ...headerTextOptions,
      lineGap: 1
    });

    doc.moveDown(0.1);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f1f1f');
    doc.text(tagline, textX, doc.y, {
      ...headerTextOptions,
      lineGap: 1
    });

    doc.moveDown(0.15);
    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#000000');
    doc.text(titulo, textX, doc.y, headerTextOptions);

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
  const usuarioIncidencia = valorSeguro(
    registro.nombre_propietario_externo || contactoReporte || propietario,
    'No registrado'
  );
  const contactoPropietario = valorSeguro(
    registro.propietario_contacto,
    'No registrado'
  );
  const fechaReporte =
    formatearFechaLarga?.(registro.incidencia_creada_en) || 'No registrada';

  // Tiempo de uso (opcional) para que se parezca al formato
  const tiempoUsoTexto = valorSeguro(detalles?.tiempoUso, 'No registrado');

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
        { label: 'Usuario', value: usuarioIncidencia },
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
    DEPARTAMENTO_TECNICO_DEFAULT
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

  const { pageWidth, startX, drawDocumentHeader } = construirUtilidadesLayout(doc);

  const categoriaTexto = valorSeguro(registro.categoria_nombre, 'No registrada');
  const esEquipoComputo = /cpu|laptop|pc/i.test(categoriaTexto || '');
  const especificaciones = esEquipoComputo
    ? {
        procesador:
          registro.diagnostico_procesador || registro.activo_procesador || 'No registrado',
        memoria_ram:
          registro.diagnostico_memoria_ram || registro.activo_memoria_ram || 'No registrada',
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

  const nombreEquipoCalculado = [registro.marca, registro.modelo]
    .map((texto) => String(texto ?? '').trim())
    .filter(Boolean)
    .join(' ');
  const nombreEquipo = valorSeguro(
    registro.nombre_equipo || registro.nombre_activo || nombreEquipoCalculado,
    'N/A'
  );

  const formatearFechaOpcional = (valor) => {
    if (!valor) return null;
    return formatearFechaLarga?.(valor) || null;
  };

  const fechaSegura = (valor, reemplazo = 'No registrada') =>
    formatearFechaOpcional(valor) || reemplazo;

  const vigenciaGarantiaTexto = (() => {
    const lineas = [
      formatearFechaOpcional(registro.fecha_compra),
      formatearFechaOpcional(registro.fecha_garantia)
    ].filter(Boolean);
    return lineas.length ? lineas.join('\n') : 'No registrada';
  })();

  const tiempoUsoTexto =
    textoOpcional(detalles?.tiempoUso) || textoOpcional(registro.tiempo_uso) || 'No registrado';

  const descripcionGrafica = valorSeguro(
    registro.diagnostico_evidencia,
    'No se proporcionó descripción gráfica para esta baja.'
  );
  const diagnosticoTecnico = valorSeguro(
    registro.diagnostico_tecnico,
    'No se registró un diagnóstico técnico para esta baja.'
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
    DEPARTAMENTO_TECNICO_DEFAULT
  );

  drawDocumentHeader('Formato de Baja de Equipo de Cómputo', {
    mostrarNombreHotel: true,
    tagline: 'SISTEMAS - SOPORTE TÉCNICO',
    alinearCentro: true
  });

  const drawSectionBanner = (titulo) => {
    const bannerHeight = 22;
    const bannerY = doc.y;
    doc.save();
    doc
      .lineWidth(1)
      .fillColor(COLOR_ACCENT)
      .rect(startX, bannerY, pageWidth, bannerHeight)
      .fill();
    doc.restore();
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#ffffff')
      .text(titulo, startX + 8, bannerY + 5, { width: pageWidth - 16 });
    doc.fillColor('#000000');
    doc.y = bannerY + bannerHeight + 8;
  };

  const drawInfoGrid = (items, { columns = 2, minRowHeight = 38 } = {}) => {
    const padding = 8;
    const columnWidth = pageWidth / columns;

    const calcularAltura = (item, width) => {
      if (!item) return minRowHeight;
      const valueText = textoOpcional(item.value) || 'No registrado';
      const labelHeight = item.label ? 11 : 0;
      doc.font('Helvetica').fontSize(10);
      const valueHeight = doc.heightOfString(valueText, {
        width: width - padding * 2,
        lineGap: 1.4
      });
      return Math.max(minRowHeight, padding * 2 + labelHeight + valueHeight + 4);
    };

    const dibujarCelda = ({ item, x, width, height, baseY }) => {
      const cellY = baseY ?? doc.y;
      doc
        .lineWidth(1)
        .strokeColor(COLOR_ACCENT)
        .rect(x, cellY, width, height)
        .stroke();

      if (!item) return;

      const labelY = cellY + padding;
      if (item.label) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(COLOR_ACCENT)
          .text(item.label.toUpperCase(), x + padding, labelY, {
            width: width - padding * 2
          });
      }

      const valueY = item.label ? labelY + 11 : labelY;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#000000')
        .text(textoOpcional(item.value) || 'No registrado', x + padding, valueY, {
          width: width - padding * 2,
          lineGap: 1.5
        });
    };

    let index = 0;
    let currentY = doc.y;

    while (index < items.length) {
      const item = items[index];
      if (item?.fullRow) {
        const height = calcularAltura(item, pageWidth);
        dibujarCelda({ item, x: startX, width: pageWidth, height, baseY: currentY });
        currentY += height;
        index += 1;
        continue;
      }

      const rowItems = [];
      for (let col = 0; col < columns; col += 1) {
        rowItems.push(items[index] ?? null);
        index += 1;
      }

      let rowHeight = minRowHeight;
      rowItems.forEach((rowItem) => {
        rowHeight = Math.max(rowHeight, calcularAltura(rowItem, columnWidth));
      });

      rowItems.forEach((rowItem, colIndex) => {
        const cellX = startX + colIndex * columnWidth;
        dibujarCelda({ item: rowItem, x: cellX, width: columnWidth, height: rowHeight, baseY: currentY });
      });

      currentY += rowHeight;
    }

    doc.strokeColor('#000000');
    doc.fillColor('#000000');
    doc.y = currentY + 10;
  };

  const drawContentBox = (titulo, contenido, opciones = {}) => {
    const padding = 12;
    const minHeight = opciones.minHeight ?? 140;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLOR_ACCENT)
      .text(titulo, startX, doc.y);
    doc.fillColor('#000000');

    const boxTop = doc.y + 4;
    doc.font('Helvetica').fontSize(10);
    const texto = valorSeguro(contenido, 'No registrado');
    const textHeight = doc.heightOfString(texto, {
      width: pageWidth - padding * 2,
      lineGap: 2
    });
    const boxHeight = Math.max(minHeight, textHeight + padding * 2);

    doc
      .lineWidth(1)
      .strokeColor(COLOR_ACCENT)
      .rect(startX, boxTop, pageWidth, boxHeight)
      .stroke();

    doc
      .fillColor('#000000')
      .text(texto, startX + padding, boxTop + padding, {
        width: pageWidth - padding * 2,
        lineGap: 2
      });

    doc.y = boxTop + boxHeight + 12;
  };

  const resumenBaja = [
    { label: 'Área', value: valorSeguro(registro.area_nombre, 'No registrada') },
    { label: 'Departamento', value: valorSeguro(registro.departamento_nombre, 'No registrado') },
    { label: 'Usuario que reporta', value: valorSeguro(contactoReporte, 'No registrado') },
    { label: 'Fecha de Diagnóstico', value: fechaSegura(registro.fecha_diagnostico) },
    {
      label: 'Fecha de Reimpresión',
      value: fechaSegura(registro.baja_fecha_reimpresion, 'No registrada'),
      fullRow: true
    }
  ];

  drawInfoGrid(resumenBaja, { columns: 2, minRowHeight: 44 });

  drawSectionBanner('Datos del Equipo');
  const datosEquipo = [
    { label: 'Equipo', value: categoriaTexto },
    { label: 'Marca', value: valorSeguro(registro.marca, 'No registrada') },
    { label: 'Modelo', value: valorSeguro(registro.modelo, 'No registrado') },
    { label: 'Placa de AF', value: valorSeguro(registro.placa_activo, 'No registrada') },
    { label: 'S/N', value: valorSeguro(registro.numero_serie, 'No registrado') },
    { label: 'Tiempo total de uso', value: tiempoUsoTexto }
  ];
  drawInfoGrid(datosEquipo, { columns: 2, minRowHeight: 46 });
  drawInfoGrid([{ label: 'Nombre de Equipo', value: nombreEquipo }], {
    columns: 1,
    minRowHeight: 40
  });

  drawSectionBanner('Datos Específicos');
  drawInfoGrid(
    [
      { label: 'Procesador', value: especificaciones.procesador },
      { label: 'Almacenamiento', value: especificaciones.almacenamiento },
      { label: 'Memoria RAM', value: especificaciones.memoria_ram },
      { label: 'Vigencia de garantía', value: vigenciaGarantiaTexto }
    ],
    { columns: 4, minRowHeight: 60 }
  );

  drawContentBox('Descripción Gráfica', descripcionGrafica, { minHeight: 180 });
  drawContentBox('Diagnóstico Técnico', diagnosticoTecnico, { minHeight: 160 });

  doc.moveDown(0.6);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#000000')
    .text('Espacio para firma del técnico responsable', startX);
  doc.moveDown(0.4);
  const firmaLineWidth = Math.min(pageWidth * 0.65, 340);
  const firmaLineY = doc.y;
  doc
    .lineWidth(1.2)
    .strokeColor(COLOR_ACCENT)
    .moveTo(startX, firmaLineY)
    .lineTo(startX + firmaLineWidth, firmaLineY)
    .stroke();
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#000000')
    .text('Firma del técnico', startX, firmaLineY + 4, {
      width: firmaLineWidth,
      align: 'center'
    });

  doc.moveDown(1.3);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(nombreTecnico, startX, doc.y, { width: pageWidth });
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(PUESTO_TECNICO_DEFAULT, startX, doc.y, { width: pageWidth });
  doc.text(`Departamento: ${departamentoTecnico}`, startX, doc.y, { width: pageWidth });
  doc.text(`Correo: ${correoTecnico}`, startX, doc.y, { width: pageWidth });
  doc.text(`Dirección: ${DIRECCION_HOTEL_XCARET_ARTE}`, startX, doc.y, { width: pageWidth });

  doc.moveDown(0.9);
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

