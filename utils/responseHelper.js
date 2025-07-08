class ResponseHelper {
  static success(res, data = null, message = 'Operación exitosa', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, message = 'Error interno del servidor', statusCode = 500, details = null) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  static notFound(res, resource = 'Recurso') {
    return res.status(404).json({
      success: false,
      error: `${resource} no encontrado`,
      timestamp: new Date().toISOString()
    });
  }

  static unauthorized(res, message = 'No autorizado') {
    return res.status(401).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  static forbidden(res, message = 'Acceso denegado') {
    return res.status(403).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ResponseHelper;