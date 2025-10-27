import { Router } from 'express';
import { getLogin, postLogin, getLogout } from '../controllers/auth.controller.js';

const router = Router();

router.get('/login', getLogin);
router.post('/login', postLogin);
router.post('/logout', getLogout);

// Ruta opcional para sembrar un admin al inicio (ejecútala una sola vez y luego bórrala o protégela)


export default router;
