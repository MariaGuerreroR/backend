const express = require('express');
const siteSettingsController = require('../controllers/siteSettingsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas
router.get('/public', siteSettingsController.getPublicSettings);

// Rutas protegidas
router.get('/', authenticateToken, siteSettingsController.getSettings);
router.put('/', authenticateToken, siteSettingsController.updateSettings);

module.exports = router;