const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar configuraciones y utilidades
const database = require('./config/database');
const logger = require('./utils/logger');

// Importar rutas
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const activityRoutes = require('./routes/activities');
const imageRoutes = require('./routes/images');
const siteSettingsRoutes = require('./routes/siteSettings');
const userRoutes = require('./routes/users');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.httpsPort = process.env.HTTPS_PORT || 3001;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Seguridad
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false // Disable for development
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por ventana de tiempo
      message: {
        success: false,
        error: 'Demasiadas solicitudes, intenta de nuevo más tarde'
      }
    });
    this.app.use('/api/', limiter);

    // CORS configurado para HTTPS
    this.app.use(cors({
      origin: [
        'https://localhost:5173',
        'http://localhost:5173',
        process.env.FRONTEND_URL || 'https://localhost:5173'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compresión
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Body parsing
   this.app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    // Solo validar si el contenido existe
    if (buf && buf.length > 0) {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({
          success: false,
          error: 'JSON inválido'
        });
        throw new Error('JSON inválido');
      }
    }
  }
}));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Headers de seguridad adicionales
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      next();
    });
  }

  initializeRoutes() {
    // Ruta de salud
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Servidor funcionando correctamente con HTTPS',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
        protocol: 'HTTPS'
      });
    });

    // Rutas principales
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/posts', postRoutes);
    this.app.use('/api/activities', activityRoutes);
    this.app.use('/api/images', imageRoutes);
    this.app.use('/api/site-settings', siteSettingsRoutes);
    this.app.use('/api/users', userRoutes);

    // Ruta para servir archivos estáticos (si es necesario)
    this.app.use('/uploads', express.static('uploads'));

    // Manejo de rutas no encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  initializeErrorHandling() {
   this.app.use((error, req, res, next) => {
  logger.error('Error no manejado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Si la respuesta ya fue enviada, no intentes responder otra vez
  if (res.headersSent) {
    return next(error);
  }

  // Error de validación de Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: errors
    });
  }

  // Error de duplicado de MongoDB
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `Ya existe un registro con ese ${field}`
    });
  }

  // Error de cast de MongoDB
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'ID inválido'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});
  }
  createHTTPSOptions() {
    try {
      const keyPath = path.join(__dirname, 'certs', 'key.pem');
      const certPath = path.join(__dirname, 'certs', 'cert.pem');

      // Check if certificates exist, if not create them
      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        logger.info('🔐 Certificados HTTPS no encontrados, creando nuevos...');
        this.createSSLCertificates();
      }

      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
    } catch (error) {
      logger.error('Error cargando certificados HTTPS:', error);
      return null;
    }
  }

  createSSLCertificates() {
    const { execSync } = require('child_process');
    const certsDir = path.join(__dirname, 'certs');

    // Create certs directory if it doesn't exist
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    try {
      // Generate self-signed certificate
      execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${path.join(certsDir, 'key.pem')} -out ${path.join(certsDir, 'cert.pem')} -days 365 -nodes -subj "/C=CO/ST=Bogota/L=Bogota/O=PersonalBlog/OU=Dev/CN=localhost"`, {
        stdio: 'inherit'
      });
      logger.info('✅ Certificados HTTPS creados exitosamente');
    } catch (error) {
      logger.error('❌ Error creando certificados HTTPS:', error);
      throw error;
    }
  }

  async start() {
    try {
      // Conectar a la base de datos
      await database.connect();
      
      // Configurar HTTPS
      const httpsOptions = this.createHTTPSOptions();
      
      if (httpsOptions) {
        // Iniciar servidor HTTPS
        const httpsServer = https.createServer(httpsOptions, this.app);
        
        httpsServer.listen(this.httpsPort, () => {
          logger.info(`🚀 Servidor HTTPS iniciado en puerto ${this.httpsPort}`);
          logger.info(`📡 API disponible en https://localhost:${this.httpsPort}/api`);
          logger.info(`🌍 Entorno: ${process.env.NODE_ENV}`);
          logger.info(`📊 Base de datos: Conectada`);
          logger.info(`🔒 Protocolo: HTTPS (Seguro)`);
        });

        // Manejo de cierre graceful
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
      } else {
        // Fallback a HTTP si no se pueden crear certificados
        logger.warn('⚠️  Iniciando en modo HTTP (no recomendado para producción)');
        this.app.listen(this.port, () => {
          logger.info(`🚀 Servidor HTTP iniciado en puerto ${this.port}`);
          logger.info(`📡 API disponible en http://localhost:${this.port}/api`);
        });
      }

    } catch (error) {
      logger.error('Error iniciando servidor:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown(signal) {
    logger.info(`🔄 Recibida señal ${signal}. Cerrando servidor...`);
    
    try {
      await database.disconnect();
      logger.info('✅ Servidor cerrado correctamente');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error cerrando servidor:', error);
      process.exit(1);
    }
  }
}

// Inicializar y arrancar servidor
const server = new Server();
server.start();

module.exports = server;