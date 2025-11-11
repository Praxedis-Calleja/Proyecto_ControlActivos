import { Router } from 'express';
import { requiereLogin } from '../middleware/auth.js';
import {
  getListadoIncidencias,
  getDiagnosticoIncidencia,
  getDiagnosticoPdf,
  getDiagnosticoBajaPdf,
  getNuevaIncidencia,
  postDiagnosticoIncidencia,
  postNuevaIncidencia
} from '../controllers/incidencias.controller.js';

const router = Router();

router.get('/', requiereLogin, getListadoIncidencias);
router.get('/:id/diagnostico/pdf/:diagnosticoId', requiereLogin, getDiagnosticoPdf);
router.get(
  '/:id/diagnostico/baja/pdf/:diagnosticoId',
  requiereLogin,
  getDiagnosticoBajaPdf
);
router.get('/:id/diagnostico', requiereLogin, getDiagnosticoIncidencia);
router.post('/:id/diagnostico', requiereLogin, postDiagnosticoIncidencia);
router.get('/nueva', requiereLogin, getNuevaIncidencia);
router.post('/nueva', requiereLogin, postNuevaIncidencia);

export default router;
