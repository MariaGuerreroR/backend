const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  heroTitle: {
    type: String,
    default: 'Bienvenidos a Mi Mundo',
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  heroDescription: {
    type: String,
    default: 'Un espacio donde comparto mis pensamientos, experiencias y momentos especiales. Cada historia es una ventana a mi corazón y mis reflexiones sobre la vida.',
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Índice para optimizar consultas
siteSettingsSchema.index({ userId: 1 });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);