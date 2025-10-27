import { pool } from '../db.js';

export const getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  // si usas csurf y res.locals.csrfToken se inyecta en middleware global, no hace falta pasarlo aquí
  res.render('auth/login', { error: null });
};

export const postLogin = async (req, res) => {
  try {
    const correo = (req.body.correo ?? '').trim().toLowerCase();
    const contrasena = req.body.contrasena ?? '';

    console.log('[LOGIN] BODY:', req.body);

    if (!correo || !contrasena) {
      console.log('[LOGIN] Falta correo o contraseña');
      return res.status(400).render('auth/login', { error: 'Falta correo o contraseña' });

    }

    // Ver en qué BD estás
    const [[dbRow]] = await pool.query('SELECT DATABASE() AS db');
    console.log('[LOGIN] Conectado a BD:', dbRow.db);

    const [rows] = await pool.query(
      `SELECT 
         id_usuario,
         nombre,
         apellido,
         LOWER(correo) AS correo,
         COALESCE(NULLIF(Rol,''), 'Administrador') AS rol,
         contrasena AS contrasena
       FROM usuarios
       WHERE LOWER(Correo) = ? AND contrasena = ?
       LIMIT 1`,
      [correo, contrasena]
    );

    console.log('[LOGIN] rows.length =', rows.length);
    if (!rows.length) {
      console.log('[LOGIN] No se encontró usuario con correo:', correo);
      return res.status(401).render('auth/login', { error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    console.log('[LOGIN] Usuario encontrado:', {
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol,
    });

    if (!user.contrasena) {
      console.warn('⚠ Usuario sin contraseña en BD:', user);
      return res.status(401).render('auth/login', { error: 'El usuario no tiene contraseña registrada' });
    }

    req.session.user = {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol
    };

    return res.redirect('/');
  } catch (e) {
    console.error('postLogin error:', e);
    return res.status(500).render('auth/login', { error: 'Error interno' });
  }
};

export const getLogout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};
