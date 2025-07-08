const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingresa un email válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // Por defecto no incluir en consultas
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// SOLO un índice para email (eliminar duplicados)
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  // Solo hashear si la contraseña fue modificada
  if (!this.isModified('password')) return next();
  
  try {
    console.log('🔐 Hasheando contraseña para usuario:', this.email);
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Contraseña hasheada exitosamente');
    next();
  } catch (error) {
    console.error('❌ Error hasheando contraseña:', error);
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Comparando contraseñas para usuario:', this.email);
    console.log('🔍 Contraseña candidata recibida:', candidatePassword ? 'Sí' : 'No');
    console.log('🔍 Hash almacenado existe:', this.password ? 'Sí' : 'No');
    
    if (!this.password) {
      console.log('❌ No hay hash de contraseña almacenado');
      return false;
    }
    
    if (!candidatePassword) {
      console.log('❌ No se proporcionó contraseña candidata');
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔍 Resultado de comparación:', isMatch ? 'MATCH' : 'NO MATCH');
    
    return isMatch;
  } catch (error) {
    console.error('❌ Error comparando contraseñas:', error);
    return false;
  }
};

// Método para actualizar último login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);