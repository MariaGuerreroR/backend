const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// ✅ Rutas públicas con función flecha para mantener el contexto
router.post('/register', validateRegistration, (req, res) => authController.register(req, res));
router.post('/login', validateLogin, (req, res) => authController.login(req, res));

// ✅ Rutas protegidas también corregidas
router.get('/profile', authenticateToken, (req, res) => authController.getProfile(req, res));
router.put('/profile', authenticateToken, (req, res) => authController.updateProfile(req, res));

module.exports = router;
