const Activity = require('../models/Activity');
const mongoose = require('mongoose');

class ActivityController {
  // Obtener todas las actividades
  async getAllActivities(req, res) {
    try {
      const { userId, page = 1, limit = 10, category, search } = req.query;
      
      let query = {};
      
      // Filtrar por usuario si se especifica
      if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({
            success: false,
            error: 'ID de usuario inválido'
          });
        }
        query.userId = new mongoose.Types.ObjectId(userId);
      }

      // Filtrar por categoría si se especifica
      if (category) {
        query.category = category;
      }

      // Búsqueda por texto si se especifica
      if (search) {
        query.$text = { $search: search };
      }

      const activities = await Activity.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Activity.countDocuments(query);

      res.json({
        success: true,
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo actividades:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener una actividad por ID
  async getActivityById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de actividad inválido'
        });
      }

      const activity = await Activity.findById(id).populate('userId', 'name email');
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada'
        });
      }

      res.json({
        success: true,
        activity
      });
    } catch (error) {
      console.error('Error obteniendo actividad:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Crear nueva actividad
  async createActivity(req, res) {
    try {
      const { 
        title, 
        description, 
        character, 
        links, 
        category, 
        difficulty, 
        estimatedTime 
      } = req.body;
      const userId = req.user.userId;

      const newActivity = new Activity({
        title,
        description,
        character: character || '/12.png',
        links: links || [],
        documents: [],
        images: [],
        category: category || 'academic',
        difficulty: difficulty || 'beginner',
        estimatedTime,
        userId
      });

      await newActivity.save();
      await newActivity.populate('userId', 'name email');

      res.status(201).json({
        success: true,
        message: 'Actividad creada exitosamente',
        activity: newActivity
      });
    } catch (error) {
      console.error('Error creando actividad:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar actividad
  async updateActivity(req, res) {
    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        character, 
        links, 
        category, 
        difficulty, 
        estimatedTime 
      } = req.body;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de actividad inválido'
        });
      }

      const activity = await Activity.findOneAndUpdate(
        { _id: id, userId },
        { 
          title, 
          description, 
          character, 
          links, 
          category, 
          difficulty, 
          estimatedTime 
        },
        { new: true, runValidators: true }
      ).populate('userId', 'name email');

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada o no autorizada'
        });
      }

      res.json({
        success: true,
        message: 'Actividad actualizada exitosamente',
        activity
      });
    } catch (error) {
      console.error('Error actualizando actividad:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Subir documento a actividad
  async uploadDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de actividad inválido'
        });
      }

      const activity = await Activity.findOne({ _id: id, userId });

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada o no autorizada'
        });
      }

      if (activity.documents.length >= 3) {
        return res.status(400).json({
          success: false,
          error: 'No se pueden subir más de 3 documentos por actividad'
        });
      }

      // Convertir buffer a base64
      const base64Document = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const newDocument = {
        name: req.file.originalname,
        data: base64Document,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      };

      activity.documents.push(newDocument);
      await activity.save();

      res.json({
        success: true,
        message: 'Documento subido exitosamente',
        document: newDocument
      });
    } catch (error) {
      console.error('Error subiendo documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Subir imagen a actividad
  async uploadImage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo de imagen'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de actividad inválido'
        });
      }

      const activity = await Activity.findOne({ _id: id, userId });

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada o no autorizada'
        });
      }

      if (activity.images.length >= 5) {
        return res.status(400).json({
          success: false,
          error: 'No se pueden subir más de 5 imágenes por actividad'
        });
      }

      // Convertir buffer a base64
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const newImage = {
        name: req.file.originalname,
        data: base64Image,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      };

      activity.images.push(newImage);
      await activity.save();

      res.json({
        success: true,
        message: 'Imagen subida exitosamente',
        image: newImage
      });
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar documento de actividad
  async deleteDocument(req, res) {
    try {
      const { id, documentId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de actividad inválido'
        });
      }

      const activity = await Activity.findOne({ _id: id, userId });

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada o no autorizada'
        });
      }

      activity.documents = activity.documents.filter(doc => doc._id.toString() !== documentId);
      await activity.save();

      res.json({
        success: true,
        message: 'Documento eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar imagen de actividad
  async deleteImage(req, res) {
    try {
      const { id, imageId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de actividad inválido'
        });
      }

      const activity = await Activity.findOne({ _id: id, userId });

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada o no autorizada'
        });
      }

      activity.images = activity.images.filter(img => img._id.toString() !== imageId);
      await activity.save();

      res.json({
        success: true,
        message: 'Imagen eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar actividad
  async deleteActivity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de actividad inválido'
        });
      }

      const activity = await Activity.findOneAndDelete({ _id: id, userId });

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Actividad no encontrada o no autorizada'
        });
      }

      res.json({
        success: true,
        message: 'Actividad eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando actividad:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener categorías disponibles
  async getCategories(req, res) {
    try {
      const categories = ['academic', 'personal', 'professional', 'creative', 'other'];
      res.json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new ActivityController();