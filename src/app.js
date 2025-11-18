import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import csurf from 'csurf';
import morgan from 'morgan';
import 'dotenv/config';
import { dbConfig, pool } from './db.js';

import authRoutes from './routes/auth.routes.js';
import activosRoutes from './routes/activos.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import incidenciasRoutes from './routes/incidencias.routes.js';
import bajasRoutes from './routes/bajas.routes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Motor de vistas y estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Logs
app.use(morgan('dev'));

// Seguridad básica
app.use(helmet({
  contentSecurityPolicy: false
}));

// Sesiones en MySQL
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    createDatabaseTable: true
  },
  pool
);

sessionStore.on('error', (error) => {
  console.error('[SESSION STORE] Error de conexión a MySQL:', error.message);
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2 // 2h
  }
}));

// CSRF (aplicar después de sesiones)
const csrfValue = (req) => {
  if (req.body) {
    if (req.body.csrfToken) return req.body.csrfToken;
    if (req.body._csrf) return req.body._csrf;
  }
  if (req.query && req.query._csrf) return req.query._csrf;
  return req.headers['csrf-token'];
};

app.use(csurf({ value: csrfValue }));

// Variable global para vistas (token CSRF y usuario)
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.session.user || null;
  const path = req.path || '/';
  const segments = path.split('/').filter(Boolean);
  res.locals.currentSection = segments.length ? `/${segments[0]}` : '/';
  res.locals.currentPath = req.originalUrl || path;
  next();
});

// Rutas
app.use('/', authRoutes);
app.use('/activos', activosRoutes);

app.use('/', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/incidencias', incidenciasRoutes);
app.use('/bajas', bajasRoutes);


// Home
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  return res.redirect('/activos');
});

// Errores CSRF
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') return res.status(403).send('CSRF token inválido');
  next(err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor en http://localhost:${port}`));

