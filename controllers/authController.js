const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un usuario con este email',
      });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password.trim(),
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password.trim()))) {
      return res.status(401).json({
        success: false,
        error: 'Email o contraseña incorrectos',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Cuenta desactivada',
      });
    }

    await user.updateLastLogin();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
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
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, profileImage },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
