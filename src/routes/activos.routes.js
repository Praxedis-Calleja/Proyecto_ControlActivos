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

const rolesPermitidos = ['Administrador', 'Técnico', 'Tecnico'];

router.get('/', requiereLogin, requiereRol(rolesPermitidos), getActivos);
router.get('/nuevo', requiereLogin, requiereRol(rolesPermitidos), getNuevoActivo);
router.post('/', requiereLogin, requiereRol(rolesPermitidos), postNuevoActivo);
router.get('/:id', requiereLogin, requiereRol(rolesPermitidos), getDetalleActivo);
router.get('/:id/editar', requiereLogin, requiereRol(rolesPermitidos), getEditarActivo);
router.post('/:id/editar', requiereLogin, requiereRol(rolesPermitidos), postEditarActivo);

export default router;
    