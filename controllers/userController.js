const User = require('../models/User');
const Post = require('../models/Post');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');

class UserController {
  // Obtener todos los usuarios con estadísticas
  async getAllUsers(req, res) {
    try {
      const users = await User.find({ isActive: true })
        .select('name email createdAt')
        .sort({ createdAt: -1 });

      // Obtener estadísticas para cada usuario
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const [postsCount, activitiesCount] = await Promise.all([
            Post.countDocuments({ userId: user._id }),
            Activity.countDocuments({ userId: user._id })
          ]);

          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            postsCount,
            activitiesCount
          };
        })
      );

      res.json({
        success: true,
        users: usersWithStats
      });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener un usuario por ID con estadísticas
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de usuario inválido'
        });
      }

      const user = await User.findById(id).select('name email createdAt');
      
      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Obtener estadísticas del usuario
      const [postsCount, activitiesCount] = await Promise.all([
        Post.countDocuments({ userId: user._id }),
        Activity.countDocuments({ userId: user._id })
      ]);

      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          postsCount,
          activitiesCount
        }
      });
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new UserController();