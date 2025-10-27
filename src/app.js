import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import csurf from 'csurf';
import morgan from 'morgan';
import 'dotenv/config';

import authRoutes from './routes/auth.routes.js';
import activosRoutes from './routes/activos.routes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Motor de vistas y estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));

// Logs
app.use(morgan('dev'));

// Seguridad básica
app.use(helmet({
  contentSecurityPolicy: false
}));

// Sesiones en MySQL
const MySQLStore = MySQLStoreFactory(session);
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    createDatabaseTable: true
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2 // 2h
  }
}));

// CSRF (aplicar después de sesiones)
app.use(csurf());

// Variable global para vistas (token CSRF y usuario)
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.session.user || null;
  next();
});

// Rutas
app.use('/', authRoutes);
app.use('/activos', activosRoutes);

// Home
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('layouts/base', { content: 'Bienvenido' });
});

// Errores CSRF
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') return res.status(403).send('CSRF token inválido');
  next(err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor en http://localhost:${port}`));