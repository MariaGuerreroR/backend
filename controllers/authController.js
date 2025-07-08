const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
  // Generar JWT token
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  // Registro de usuario
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      console.log('📝 Intento de registro:', { name, email });

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        console.log('❌ Usuario ya existe:', email);
        return res.status(400).json({
          success: false,
          error: 'Ya existe un usuario con este email'
        });
      }

      // Crear nuevo usuario
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password.trim()
      });

      await user.save();
      console.log('✅ Usuario creado exitosamente:', user._id);

      // Generar token
      const token = this.generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('❌ Error en registro:', error);
      
      // Manejar errores específicos de MongoDB
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un usuario con este email'
        });
      }
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: 'Error de validación',
          details: errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Login de usuario
  async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log('🔐 Intento de login para:', email);
      console.log('🔐 Contraseña recibida:', password ? 'Sí' : 'No');

      // Validar que se recibieron email y password
      if (!email || !password) {
        console.log('❌ Email o contraseña faltantes');
        return res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos'
        });
      }

      // Buscar usuario por email e incluir explícitamente el password
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      
      if (!user) {
        console.log('❌ Usuario no encontrado:', email);
        return res.status(401).json({
          success: false,
          error: 'Email o contraseña incorrectos'
        });
      }

      if (!user.isActive) {
        console.log('❌ Usuario inactivo:', email);
        return res.status(401).json({
          success: false,
          error: 'Cuenta desactivada'
        });
      }

      console.log('👤 Usuario encontrado:', user._id);
      console.log('🔍 Hash de contraseña existe:', user.password ? 'Sí' : 'No');

      // Verificar contraseña
      const isValidPassword = await user.comparePassword(password.trim());
      
      if (!isValidPassword) {
        console.log('❌ Contraseña incorrecta para:', email);
        return res.status(401).json({
          success: false,
          error: 'Email o contraseña incorrectos'
        });
      }

      console.log('✅ Login exitoso para:', email);

      // Actualizar último login
      await user.updateLastLogin();

      // Generar token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      console.error('❌ Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener perfil del usuario
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar perfil del usuario
  async updateProfile(req, res) {
    try {
      const { name, profileImage } = req.body;
      const userId = req.user.userId;

      const user = await User.findByIdAndUpdate(
        userId,
        { name, profileImage },
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage
        }
      });
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

// Exportar una instancia de la clase para mantener el contexto
module.exports = new AuthController();
