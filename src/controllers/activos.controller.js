import { pool } from '../db.js';
import Joi from 'joi';

const esquemaActivo = Joi.object({
  ID_CategoriaActivos: Joi.number().integer().required(),
  ID_Area: Joi.number().integer().required(),
  Marca: Joi.string().max(50).allow(''),
  Modelo: Joi.string().max(50).allow(''),
  Estado: Joi.string().max(50).required(),
  Fecha_Adquisicion: Joi.date().allow(null, ''),
  Precio_Lista: Joi.number().precision(2).allow(null, '')
});

export const getNuevoActivo = async (req, res) => {
  const [categorias] = await pool.query('SELECT ID_CategoriaActivos, Nombre FROM CategoriasActivos ORDER BY Nombre');
  const [areas] = await pool.query('SELECT ID_Area, Nombre_Area FROM Areas ORDER BY Nombre_Area');
  res.render('activos/nuevo', { categorias, areas, error: null });
};

export const postNuevoActivo = async (req, res) => {
  const { error, value } = esquemaActivo.validate(req.body);
  if (error) {
    const [categorias] = await pool.query('SELECT ID_CategoriaActivos, Nombre FROM CategoriasActivos ORDER BY Nombre');
    const [areas] = await pool.query('SELECT ID_Area, Nombre_Area FROM Areas ORDER BY Nombre_Area');
    return res.status(400).render('activos/nuevo', { categorias, areas, error: error.message });
  }

  const { ID_CategoriaActivos, ID_Area, Marca, Modelo, Estado, Fecha_Adquisicion, Precio_Lista } = value;

  await pool.query(
    `INSERT INTO ActivosFijos 
    (ID_CategoriaActivos, ID_Area, Marca, Modelo, Estado, Fecha_Adquisicion, Precio_Lista)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ID_CategoriaActivos, ID_Area, Marca || null, Modelo || null, Estado, Fecha_Adquisicion || null, Precio_Lista || null]
  );

  res.redirect('/activos/nuevo?ok=1');
};
