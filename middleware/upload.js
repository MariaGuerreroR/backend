const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage();

// Filtro de archivos para imágenes de personajes
const imageFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Solo se permiten: ${allowedImageTypes.join(', ')}`), false);
  }
};

// Filtro de archivos para documentos
const documentFilter = (req, file, cb) => {
  const allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedDocumentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Solo se permiten: PDF, DOC, DOCX, TXT`), false);
  }
};

// Filtro general que acepta tanto imágenes como documentos
const generalFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/png', 'image/jpeg', 'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Solo se permiten imágenes (PNG, JPG, JPEG) y documentos (PDF, DOC, DOCX, TXT)`), false);
  }
};

// Configuración de multer para imágenes de personajes
const uploadCharacterImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB para imágenes
    files: 1
  },
  fileFilter: imageFilter
});

// Configuración de multer para documentos
const uploadDocument = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para documentos
    files: 1
  },
  fileFilter: documentFilter
});

// Configuración de multer general (para actividades)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1
  },
  fileFilter: generalFilter
});

// Middleware para manejar errores de multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'El archivo es demasiado grande. Máximo 10MB permitido'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Demasiados archivos. Solo se permite un archivo'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Campo de archivo inesperado'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Error en la carga del archivo'
        });
    }
  }
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next(error);
};

module.exports = {
  upload,
  uploadCharacterImage,
  uploadDocument,
  handleMulterError
};