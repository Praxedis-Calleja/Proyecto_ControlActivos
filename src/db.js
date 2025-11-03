import mysql from 'mysql2/promise';
import 'dotenv/config';

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASS = '',
  DB_NAME = 'controlactivos',
  DB_PORT = '3306'
} = process.env;

if (!DB_NAME) {
  throw new Error(
    'Falta la variable de entorno DB_NAME. Crea un archivo .env con los datos de conexión a MySQL.'
  );
}

export const dbConfig = {
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  port: Number(DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);

pool
  .getConnection()
  .then((connection) => {
    connection.release();
  })
  .catch((error) => {
    console.error('[DB] No se pudo conectar a MySQL. Revisa las variables de entorno.');
    console.error(error.message);
  });

