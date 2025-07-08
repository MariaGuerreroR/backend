const SiteSettings = require('../models/SiteSettings');
const mongoose = require('mongoose');

class SiteSettingsController {
  // Obtener configuración del sitio
  async getSettings(req, res) {
    try {
      const userId = req.user.userId;

      let settings = await SiteSettings.findOne({ userId });
      
      if (!settings) {
        // Crear configuración por defecto si no existe
        settings = new SiteSettings({ userId });
        await settings.save();
      }

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar configuración del sitio
  async updateSettings(req, res) {
    try {
      const { heroTitle, heroDescription } = req.body;
      const userId = req.user.userId;

      const settings = await SiteSettings.findOneAndUpdate(
        { userId },
        { heroTitle, heroDescription },
        { new: true, upsert: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        settings
      });
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener configuración pública (sin autenticación)
  async getPublicSettings(req, res) {
    try {
      const { userId } = req.query;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.json({
          success: true,
          settings: {
            heroTitle: 'Bienvenidos a Mi Mundo',
            heroDescription: 'Un espacio donde comparto mis pensamientos, experiencias y momentos especiales. Cada historia es una ventana a mi corazón y mis reflexiones sobre la vida.'
          }
        });
      }

      const settings = await SiteSettings.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      
      if (!settings) {
        return res.json({
          success: true,
          settings: {
            heroTitle: 'Bienvenidos a Mi Mundo',
            heroDescription: 'Un espacio donde comparto mis pensamientos, experiencias y momentos especiales. Cada historia es una ventana a mi corazón y mis reflexiones sobre la vida.'
          }
        });
      }

      res.json({
        success: true,
        settings: {
          heroTitle: settings.heroTitle,
          heroDescription: settings.heroDescription
        }
      });
    } catch (error) {
      console.error('Error obteniendo configuración pública:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new SiteSettingsController();