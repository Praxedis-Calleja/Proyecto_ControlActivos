import { Router } from 'express';
import { requiereLogin, requiereRol } from '../middleware/auth.js';
import {
  getActivos,
  getNuevoActivo,
  postNuevoActivo,
  getDetalleActivo,
  getEditarActivo,
  postEditarActivo
} from '../controllers/activos.controller.js';

const router = Router();

router.get('/', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), getActivos);
router.post('/', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), postNuevoActivo);
router.get('/activos', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), getNuevoActivo);
router.post('/activos', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), postNuevoActivo);
router.get('/:id/editar', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), getEditarActivo);
router.post('/:id/editar', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), postEditarActivo);
router.get('/:id', requiereLogin, requiereRol(['Administrador', 'Técnico', 'Tecnico']), getDetalleActivo);

export default router;
    