const Image = require('../models/Image');
const mongoose = require('mongoose');

class ImageController {
  // Obtener todas las imágenes del usuario
  async getAllImages(req, res) {
    try {
      const { page = 1, limit = 10, isPublic } = req.query;
      const userId = req.user.userId;
      
      let query = { userId };
      
      // Filtrar por imágenes públicas si se especifica
      if (isPublic !== undefined) {
        query.isPublic = isPublic === 'true';
      }

      const images = await Image.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Image.countDocuments(query);

      res.json({
        success: true,
        images,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo imágenes:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener una imagen por ID
  async getImageById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de imagen inválido'
        });
      }

      const image = await Image.findOne({ _id: id, userId });
      
      if (!image) {
        return res.status(404).json({
          success: false,
          error: 'Imagen no encontrada'
        });
      }

      res.json({
        success: true,
        image
      });
    } catch (error) {
      console.error('Error obteniendo imagen:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Subir nueva imagen
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo de imagen'
        });
      }

      const { description, tags, isPublic } = req.body;
      const userId = req.user.userId;

      // Convertir buffer a base64
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const newImage = new Image({
        name: req.file.originalname,
        data: base64Image,
        size: req.file.size,
        mimeType: req.file.mimetype,
        description: description || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublic: isPublic === 'true',
        userId
      });

      await newImage.save();

      res.status(201).json({
        success: true,
        message: 'Imagen subida exitosamente',
        image: {
          id: newImage._id,
          name: newImage.name,
          size: newImage.size,
          mimeType: newImage.mimeType,
          description: newImage.description,
          tags: newImage.tags,
          isPublic: newImage.isPublic,
          createdAt: newImage.createdAt
        }
      });
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar imagen
  async updateImage(req, res) {
    try {
      const { id } = req.params;
      const { description, tags, isPublic } = req.body;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de imagen inválido'
        });
      }

      const updateData = {
        description,
        isPublic: isPublic === 'true'
      };

      if (tags) {
        updateData.tags = tags.split(',').map(tag => tag.trim());
      }

      const image = await Image.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!image) {
        return res.status(404).json({
          success: false,
          error: 'Imagen no encontrada o no autorizada'
        });
      }

      res.json({
        success: true,
        message: 'Imagen actualizada exitosamente',
        image
      });
    } catch (error) {
      console.error('Error actualizando imagen:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar imagen
  async deleteImage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de imagen inválido'
        });
      }

      const image = await Image.findOneAndDelete({ _id: id, userId });

      if (!image) {
        return res.status(404).json({
          success: false,
          error: 'Imagen no encontrada o no autorizada'
        });
      }

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

  // Obtener imágenes públicas (sin autenticación)
  async getPublicImages(req, res) {
    try {
      const { page = 1, limit = 10, tags } = req.query;
      
      let query = { isPublic: true };
      
      // Filtrar por tags si se especifica
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagArray };
      }

      const images = await Image.find(query)
        .select('-data') // No incluir los datos de la imagen para optimizar
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Image.countDocuments(query);

      res.json({
        success: true,
        images,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo imágenes públicas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new ImageController();