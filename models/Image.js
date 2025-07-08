const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la imagen es requerido'],
    trim: true
  },
  data: {
    type: String,
    required: [true, 'Los datos de la imagen son requeridos']
  },
  size: {
    type: Number,
    required: true,
    max: [5242880, 'El archivo no puede exceder 5MB'] // 5MB en bytes
  },
  mimeType: {
    type: String,
    required: true,
    enum: ['image/png', 'image/jpeg', 'image/jpg']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
imageSchema.index({ userId: 1, createdAt: -1 });
imageSchema.index({ isPublic: 1 });
imageSchema.index({ tags: 1 });

module.exports = mongoose.model('Image', imageSchema);