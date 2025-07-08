const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Rutas públicas
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);

module.exports = router;