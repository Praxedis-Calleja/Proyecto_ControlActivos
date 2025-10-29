import { Router } from 'express';
import { requiereLogin, requiereRol } from '../middleware/auth.js';
import { getActivos, getNuevoActivo, postNuevoActivo } from '../controllers/activos.controller.js';

const router = Router();

router.get('/', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), getActivos);
router.post('/', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), postNuevoActivo);
router.get('/nuevo', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), getNuevoActivo);
router.post('/nuevo', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), postNuevoActivo);

export default router;
    