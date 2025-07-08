const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const database = require('./config/database');
const logger = require('./utils/logger');

// Rutas
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const activityRoutes = require('./routes/activities');
const imageRoutes = require('./routes/images');
const siteSettingsRoutes = require('./routes/siteSettings');
const userRoutes = require('./routes/users');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: [
    'https://my-personal-blog-gilt-two.vercel.app',
    process.env.FRONTEND_URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  }
});
app.use('/api/', limiter);

// Headers extra
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Rutas
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/users', userRoutes);
app.use('/uploads', express.static('uploads'));

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Middleware de errores
app.use((error, req, res, next) => {
  logger.error('Error no manejado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  if (res.headersSent) return next(error);

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ success: false, error: 'Error de validación', details: errors });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({ success: false, error: `Ya existe un registro con ese ${field}` });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// Conexión DB y arranque
(async () => {
  try {
    await database.connect();
    app.listen(port, () => {
      logger.info(`🚀 Servidor iniciado en puerto ${port}`);
      logger.info(`📡 API disponible en https://backend-1-op8u.onrender.com`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
})();


