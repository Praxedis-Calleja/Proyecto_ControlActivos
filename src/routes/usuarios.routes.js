import { Router } from 'express';
import { requiereLogin, requiereRol } from '../middleware/auth.js';
import { getRegistro, getUsuarios, postRegistro } from '../controllers/usuarios.controller.js';

const router = Router();

// Solo usuarios logueados con rol Administrador
router.get('/', requiereLogin, requiereRol(['Administrador']), getUsuarios);
router.get('/registro', requiereLogin, requiereRol(['Administrador']), getRegistro);
router.post('/registro', requiereLogin, requiereRol(['Administrador']), postRegistro);

export default router;
