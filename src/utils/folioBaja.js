export const generarFolioBaja = ({ folio, fechaBaja, idBaja }) => {
  const folioExistente = typeof folio === 'string' ? folio.trim() : '';
  if (folioExistente) {
    return folioExistente;
  }

  const fecha = fechaBaja ? new Date(fechaBaja) : null;
  const fechaValida = fecha && !Number.isNaN(fecha.getTime());
  const fechaTexto = fechaValida
    ? `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`
    : 'SINFECHA';

  const idSoloDigitos = String(idBaja ?? '')
    .replace(/[^0-9]/g, '');
  const idTexto = idSoloDigitos ? idSoloDigitos.padStart(6, '0') : '000000';

  return `BAJ-${fechaTexto}-${idTexto}`;
};
