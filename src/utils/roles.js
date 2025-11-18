export const ROLE_OPTIONS = [
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Tecnico', label: 'Técnico' },
  { value: 'Colaborador', label: 'Colaborador' }
];

const ROLE_LABELS = {
  Administrador: 'Administrador',
  Tecnico: 'Técnico',
  Colaborador: 'Colaborador'
};

export const normalizeAppRole = (rol = '') => {
  const value = String(rol || '').trim().toLowerCase();
  if (value.startsWith('admin')) return 'Administrador';
  if (value.startsWith('tec')) return 'Tecnico';
  if (value.startsWith('colab')) return 'Colaborador';
  return 'Colaborador';
};

const ROLE_TO_DB = {
  Administrador: 'Administrador',
  Tecnico: 'TECNICO',
  Colaborador: 'COLABORADOR'
};

const DB_TO_APP = {
  ADMINISTRADOR: 'Administrador',
  Administrador: 'Administrador',
  TECNICO: 'Tecnico',
  Tecnico: 'Tecnico',
  COLABORADOR: 'Colaborador',
  Colaborador: 'Colaborador'
};

export const roleToDbValue = (rol = '') => {
  const normalized = normalizeAppRole(rol);
  return ROLE_TO_DB[normalized] || ROLE_TO_DB.Colaborador;
};

export const roleFromDbValue = (rol = '') => {
  if (!rol) return 'Colaborador';
  const key = typeof rol === 'string' ? rol.trim() : '';
  const upperKey = key.toUpperCase ? key.toUpperCase() : key;
  return DB_TO_APP[key] || DB_TO_APP[upperKey] || 'Colaborador';
};

export const getRoleLabel = (rol = '') => {
  const normalized = normalizeAppRole(rol);
  return ROLE_LABELS[normalized] || ROLE_LABELS.Colaborador;
};

