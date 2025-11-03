import { Router } from 'express';
import { requiereLogin } from '../middleware/auth.js';
import { getNuevaIncidencia, postNuevaIncidencia } from '../controllers/incidencias.controller.js';

const router = Router();

router.get('/nueva', requiereLogin, getNuevaIncidencia);
router.post('/nueva', requiereLogin, postNuevaIncidencia);

export default router;
