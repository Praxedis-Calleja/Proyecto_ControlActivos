import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i;
const EXTENSIONES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp'
};

export const EVIDENCIA_TEMPORAL_CONFIG = Object.freeze({
  maxImagenes: 6,
  maxPesoBytes: 2 * 1024 * 1024, // 2 MB por imagen
  formatosPermitidos: Object.keys(EXTENSIONES)
});

const BASE_DIR = path.join(process.cwd(), 'tmp', 'evidencias-temporales');

const asegurarDirectorioBase = async () => {
  await fs.mkdir(BASE_DIR, { recursive: true });
};

const construirRutaDiagnostico = (diagnosticoId) =>
  path.join(BASE_DIR, String(diagnosticoId));

export const parseImagenesTemporales = (valor) => {
  if (!valor || typeof valor !== 'string') {
    return [];
  }

  let lista;
  try {
    lista = JSON.parse(valor);
  } catch (error) {
    return [];
  }

  if (!Array.isArray(lista) || !lista.length) {
    return [];
  }

  const imagenes = [];
  for (const item of lista) {
    if (typeof item !== 'string') continue;

    const match = item.match(DATA_URL_REGEX);
    if (!match) continue;

    const mimeType = match[1].toLowerCase();
    if (!EVIDENCIA_TEMPORAL_CONFIG.formatosPermitidos.includes(mimeType)) continue;

    const extension = EXTENSIONES[mimeType];
    if (!extension) continue;

    const base64Data = match[2].replace(/\s/g, '');
    if (!base64Data) continue;

    let buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      continue;
    }

    if (!buffer.length || buffer.length > EVIDENCIA_TEMPORAL_CONFIG.maxPesoBytes) {
      continue;
    }

    imagenes.push({ buffer, extension });
    if (imagenes.length >= EVIDENCIA_TEMPORAL_CONFIG.maxImagenes) {
      break;
    }
  }

  return imagenes;
};

export const guardarEvidenciasTemporales = async (diagnosticoId, imagenes = []) => {
  if (!diagnosticoId) {
    return [];
  }

  await asegurarDirectorioBase();
  const directorioDiagnostico = construirRutaDiagnostico(diagnosticoId);
  await fs.rm(directorioDiagnostico, { recursive: true, force: true });

  if (!imagenes.length) {
    return [];
  }

  await fs.mkdir(directorioDiagnostico, { recursive: true });
  const rutasGuardadas = [];

  for (let index = 0; index < imagenes.length; index++) {
    const imagen = imagenes[index];
    if (!imagen?.buffer?.length) continue;

    const extension = imagen.extension || 'bin';
    const nombre = `evidencia-${String(index + 1).padStart(2, '0')}.${extension}`;
    const ruta = path.join(directorioDiagnostico, nombre);

    await fs.writeFile(ruta, imagen.buffer);
    rutasGuardadas.push(ruta);
  }

  return rutasGuardadas;
};

export const obtenerEvidenciasTemporales = async (diagnosticoId) => {
  if (!diagnosticoId) {
    return [];
  }

  const directorioDiagnostico = construirRutaDiagnostico(diagnosticoId);
  let archivos;
  try {
    archivos = await fs.readdir(directorioDiagnostico);
  } catch (error) {
    return [];
  }

  if (!archivos.length) {
    return [];
  }

  const buffers = [];
  const ordenados = [...archivos].sort();

  for (const archivo of ordenados) {
    const ruta = path.join(directorioDiagnostico, archivo);
    try {
      const buffer = await fs.readFile(ruta);
      buffers.push({ buffer, ruta, nombre: archivo });
    } catch (errorLectura) {
      console.warn('No se pudo leer la evidencia temporal:', ruta, errorLectura);
    }
  }

  return buffers;
};

