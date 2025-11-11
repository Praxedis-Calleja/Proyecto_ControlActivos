import { pool } from '../db.js';
import Joi from 'joi';

// Validación básica
const esquemaUsuario = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required(),
  apellido: Joi.string().trim().allow('').max(100),
  correo: Joi.string().trim().email().max(120).required(),
  rol: Joi.string().valid('Administrador', 'Tecnico', 'Colaborador').required(),
  contrasena: Joi.string().min(3).max(255).required(),
  confirmar: Joi.string().required()
});

export const getRegistro = (req, res) => {
  res.render('usuarios/registro', {
    error: null,
    values: {},
    ok: req.query.ok === '1',
    pageTitle: 'Registrar usuario'
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
        pageTitle: 'Registrar usuario'
      });
    }

    const { nombre, apellido, correo, rol, contrasena, confirmar } = value;
    if (contrasena !== confirmar) {
      return res.status(400).render('usuarios/registro', {
        error: 'Las contraseñas no coinciden',
        values: req.body,
        ok: false,
        pageTitle: 'Registrar usuario'
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
        pageTitle: 'Registrar usuario'
      });
    }

    // Inserta en texto plano (según tu decisión)
    await pool.query(
      `INSERT INTO Usuarios (Nombre, Apellido, Correo, Rol, contrasena)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre.trim(), apellido?.trim() || '', correo.trim().toLowerCase(), rol, contrasena]
    );

    return res.redirect('/usuarios/registro?ok=1');
  } catch (e) {
    console.error('postRegistro error:', e);
    return res.status(500).render('usuarios/registro', {
      error: 'Error interno',
      values: req.body,
      ok: false,
      pageTitle: 'Registrar usuario'
    });
  }
};
