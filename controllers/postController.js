const Post = require('../models/Post');
const mongoose = require('mongoose');

class PostController {
  // Obtener todos los posts
  async getAllPosts(req, res) {
    try {
      const { userId, page = 1, limit = 10, search } = req.query;
      
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

      // Búsqueda por texto si se especifica
      if (search) {
        query.$text = { $search: search };
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: {
          path: 'userId',
          select: 'name email'
        }
      };

      const posts = await Post.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Post.countDocuments(query);

      res.json({
        success: true,
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo posts:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener un post por ID
  async getPostById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de post inválido'
        });
      }

      const post = await Post.findById(id).populate('userId', 'name email');
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado'
        });
      }

      // Incrementar vistas
      await post.incrementViews();

      // Populate comments with user info
      await post.populate('comments.userId', 'name email');
      res.json({
        success: true,
        post
      });
    } catch (error) {
      console.error('Error obteniendo post:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Crear nuevo post
  async createPost(req, res) {
    try {
      const { title, content, date, image, tags } = req.body;
      const userId = req.user.userId;

      const newPost = new Post({
        title,
        content,
        date: date || new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        image: image || '',
        tags: tags || [],
        userId
      });

      await newPost.save();
      await newPost.populate('userId', 'name email');

      res.status(201).json({
        success: true,
        message: 'Post creado exitosamente',
        post: newPost
      });
    } catch (error) {
      console.error('Error creando post:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar post
  async updatePost(req, res) {
    try {
      const { id } = req.params;
      const { title, content, date, image, tags } = req.body;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de post inválido'
        });
      }

      const post = await Post.findOneAndUpdate(
        { _id: id, userId },
        { title, content, date, image, tags },
        { new: true, runValidators: true }
      ).populate('userId', 'name email');

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado o no autorizado'
        });
      }

      res.json({
        success: true,
        message: 'Post actualizado exitosamente',
        post
      });
    } catch (error) {
      console.error('Error actualizando post:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar post
  async deletePost(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de post inválido'
        });
      }

      const post = await Post.findOneAndDelete({ _id: id, userId });

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado o no autorizado'
        });
      }

      res.json({
        success: true,
        message: 'Post eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando post:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Subir imagen a post
  async uploadPostImage(req, res) {
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
          error: 'ID de post inválido'
        });
      }

      const post = await Post.findOne({ _id: id, userId });

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado o no autorizado'
        });
      }

      if (post.postImages.length >= 5) {
        return res.status(400).json({
          success: false,
          error: 'No se pueden subir más de 5 imágenes por post'
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

      post.postImages.push(newImage);
      await post.save();

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

  // Eliminar imagen de post
  async deletePostImage(req, res) {
    try {
      const { id, imageId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de post inválido'
        });
      }

      const post = await Post.findOne({ _id: id, userId });

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado o no autorizado'
        });
      }

      post.postImages = post.postImages.filter(img => img._id.toString() !== imageId);
      await post.save();

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

  // Toggle like en post
  async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de post inválido'
        });
      }

      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado'
        });
      }

      await post.toggleLike(userId);

      res.json({
        success: true,
        message: 'Like actualizado exitosamente',
        likesCount: post.likes.length
      });
    } catch (error) {
      console.error('Error actualizando like:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Agregar comentario a post
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de post inválido'
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'El contenido del comentario es requerido'
        });
      }

      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado'
        });
      }

      await post.addComment(userId, content.trim());
      await post.populate('comments.userId', 'name email');

      res.json({
        success: true,
        message: 'Comentario agregado exitosamente',
        comments: post.comments
      });
    } catch (error) {
      console.error('Error agregando comentario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar comentario de post
  async deleteComment(req, res) {
    try {
      const { id, commentId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
      }

      const post = await Post.findById(id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado'
        });
      }

      const comment = post.comments.find(c => c._id.toString() === commentId);
      
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comentario no encontrado'
        });
      }

      // Solo el autor del comentario o del post puede eliminarlo
      if (comment.userId.toString() !== userId && post.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'No autorizado para eliminar este comentario'
        });
      }

      await post.removeComment(commentId);

      res.json({
        success: true,
        message: 'Comentario eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando comentario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new PostController();