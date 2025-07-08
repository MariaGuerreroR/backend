const express = require('express');
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/auth');
const { validateActivity } = require('../middleware/validation');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Rutas públicas
router.get('/', activityController.getAllActivities);
router.get('/categories', activityController.getCategories);
router.get('/:id', activityController.getActivityById);

// Rutas protegidas
router.post('/', authenticateToken, validateActivity, activityController.createActivity);
router.put('/:id', authenticateToken, validateActivity, activityController.updateActivity);
router.delete('/:id', authenticateToken, activityController.deleteActivity);

// Rutas para subir archivos
router.post('/:id/upload-document', 
  authenticateToken, 
  upload.single('document'), 
  handleMulterError, 
  activityController.uploadDocument
);

router.post('/:id/upload-image', 
  authenticateToken, 
  upload.single('image'), 
  handleMulterError, 
  activityController.uploadImage
);

// Rutas para eliminar archivos
router.delete('/:id/documents/:documentId', authenticateToken, activityController.deleteDocument);
router.delete('/:id/images/:imageId', authenticateToken, activityController.deleteImage);

module.exports = router;