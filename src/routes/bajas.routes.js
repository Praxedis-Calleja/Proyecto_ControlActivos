import { Router } from 'express';
import { requiereLogin, requiereRol } from '../middleware/auth.js';
import { getBajas } from '../controllers/bajas.controller.js';

const router = Router();

router.get('/', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), getBajas);

export default router;
