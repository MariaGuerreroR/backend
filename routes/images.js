const express = require('express');
const imageController = require('../controllers/imageController');
const { authenticateToken } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Rutas públicas
router.get('/public', imageController.getPublicImages);

// Rutas protegidas
router.get('/', authenticateToken, imageController.getAllImages);
router.get('/:id', authenticateToken, imageController.getImageById);
router.post('/upload', authenticateToken, upload.single('image'), handleMulterError, imageController.uploadImage);
router.put('/:id', authenticateToken, imageController.updateImage);
router.delete('/:id', authenticateToken, imageController.deleteImage);

module.exports = router;