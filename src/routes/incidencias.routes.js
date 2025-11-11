import { Router } from 'express';
import { requiereLogin } from '../middleware/auth.js';
import {
  getListadoIncidencias,
  getReportesDiagnostico,
  getDiagnosticoIncidencia,
  getDiagnosticoPdf,
  getDiagnosticoBajaPdf,
  getNuevaIncidencia,
  getEditarIncidencia,
  postDiagnosticoIncidencia,
  postCambiarEstadoIncidencia,
  postNuevaIncidencia,
  postEditarIncidencia
} from '../controllers/incidencias.controller.js';

const router = Router();

router.get('/', requiereLogin, getListadoIncidencias);
router.get('/reportes', requiereLogin, getReportesDiagnostico);
router.get('/:id/diagnostico/pdf/:diagnosticoId', requiereLogin, getDiagnosticoPdf);
router.get(
  '/:id/diagnostico/baja/pdf/:diagnosticoId',
  requiereLogin,
  getDiagnosticoBajaPdf
);
router.get('/:id/editar', requiereLogin, getEditarIncidencia);
router.post('/:id/editar', requiereLogin, postEditarIncidencia);
router.get('/:id/diagnostico', requiereLogin, getDiagnosticoIncidencia);
router.post(
  '/:id/diagnostico/estado',
  requiereLogin,
  postCambiarEstadoIncidencia
);
router.post('/:id/diagnostico', requiereLogin, postDiagnosticoIncidencia);
router.get('/nueva', requiereLogin, getNuevaIncidencia);
router.post('/nueva', requiereLogin, postNuevaIncidencia);

export default router;
