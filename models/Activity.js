const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    minlength: [3, 'El título debe tener al menos 3 caracteres'],
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres']
  },
  character: {
    type: String,
    default: '/12.png'
  },
  links: [{
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'El enlace debe ser una URL válida'
    }
  }],
  documents: [{
    name: {
      type: String,
      required: true
    },
    data: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  images: [{
    name: {
      type: String,
      required: true
    },
    data: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['image/png', 'image/jpeg', 'image/jpg']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['academic', 'personal', 'professional', 'creative', 'other'],
    default: 'academic'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedTime: {
    type: Number, // en minutos
    min: 0
  }
}, {
  timestamps: true
});

// Validaciones personalizadas
activitySchema.pre('save', function(next) {
  if (this.documents && this.documents.length > 3) {
    return next(new Error('No se pueden subir más de 3 documentos por actividad'));
  }
  if (this.images && this.images.length > 5) {
    return next(new Error('No se pueden subir más de 5 imágenes por actividad'));
  }
  next();
});

// Índices para optimizar consultas
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ isPublished: 1, category: 1 });
activitySchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Activity', activitySchema);