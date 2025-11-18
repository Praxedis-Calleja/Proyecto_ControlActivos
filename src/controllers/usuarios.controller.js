import { pool } from '../db.js';
import Joi from 'joi';
import {
  ROLE_OPTIONS,
  getRoleLabel,
  roleFromDbValue,
  roleToDbValue
} from '../utils/roles.js';

// Validación básica
const esquemaUsuario = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required(),
  apellido: Joi.string().trim().allow('').max(100),
  correo: Joi.string().trim().email().max(120).required(),
  rol: Joi.string().valid('Administrador', 'Tecnico', 'Colaborador').required(),
  contrasena: Joi.string().min(3).max(255).required(),
  confirmar: Joi.string().required()
});

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    return date.toISOString();
  }
};

export const getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre, apellido, correo, rol, creado_en
       FROM Usuarios
       ORDER BY creado_en DESC, nombre ASC`
    );

    const usuarios = rows.map((usuario) => {
      const rolApp = roleFromDbValue(usuario.rol);
      return {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: rolApp,
        rolEtiqueta: getRoleLabel(rolApp),
        creadoEnTexto: formatDateTime(usuario.creado_en)
      };
    });

    res.render('usuarios/index', {
      pageTitle: 'Usuarios',
      subtitle: 'Controla qué cuentas tienen acceso al panel administrativo.',
      usuarios,
      roles: ROLE_OPTIONS,
      ok: req.query.ok === '1',
      error: null
    });
  } catch (error) {
    console.error('getUsuarios error:', error);
    res.status(500).render('usuarios/index', {
      pageTitle: 'Usuarios',
      subtitle: 'Controla qué cuentas tienen acceso al panel administrativo.',
      usuarios: [],
      roles: ROLE_OPTIONS,
      ok: false,
      error: 'No fue posible cargar el listado de usuarios'
    });
  }
};

export const getRegistro = (req, res) => {
  res.render('usuarios/registro', {
    error: null,
    values: {},
    ok: req.query.ok === '1',
    roles: ROLE_OPTIONS,
    pageTitle: 'Registrar usuario',
    subtitle: 'Da de alta cuentas operativas con permisos específicos.'
  });
};

export const postRegistro = async (req, res) => {
  try {
    const { error, value } = esquemaUsuario.validate(req.body);
    if (error) {
      return res.status(400).render('usuarios/registro', {
        error: error.message,
        values: req.body,
        ok: false,
        roles: ROLE_OPTIONS,
        pageTitle: 'Registrar usuario',
        subtitle: 'Da de alta cuentas operativas con permisos específicos.'
      });
    }

    const { nombre, apellido, correo, rol, contrasena, confirmar } = value;
    if (contrasena !== confirmar) {
      return res.status(400).render('usuarios/registro', {
        error: 'Las contraseñas no coinciden',
        values: req.body,
        ok: false,
        roles: ROLE_OPTIONS,
        pageTitle: 'Registrar usuario',
        subtitle: 'Da de alta cuentas operativas con permisos específicos.'
      });
    }

    // ¿Existe ya el correo?
    const [existe] = await pool.query(
      'SELECT ID_Usuario FROM Usuarios WHERE LOWER(Correo) = LOWER(?) LIMIT 1',
      [correo]
    );
    if (existe.length) {
      return res.status(409).render('usuarios/registro', {
        error: 'El correo ya está registrado',
        values: req.body,
        ok: false,
        roles: ROLE_OPTIONS,
        pageTitle: 'Registrar usuario',
        subtitle: 'Da de alta cuentas operativas con permisos específicos.'
      });
    }

    const rolDbValue = roleToDbValue(rol);

    await pool.query(
      `INSERT INTO Usuarios (Nombre, Apellido, Correo, Rol, contrasena)
       VALUES (?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        apellido?.trim() || '',
        correo.trim().toLowerCase(),
        rolDbValue,
        contrasena
      ]
    );

    return res.redirect('/usuarios?ok=1');
  } catch (e) {
    console.error('postRegistro error:', e);
    return res.status(500).render('usuarios/registro', {
      error: 'Error interno',
      values: req.body,
      ok: false,
      roles: ROLE_OPTIONS,
      pageTitle: 'Registrar usuario',
      subtitle: 'Da de alta cuentas operativas con permisos específicos.'
    });
  }
};
