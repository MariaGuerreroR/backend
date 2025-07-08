const mongoose = require('mongoose');
require('dotenv').config();

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      if (this.connection) {
        console.log('✅ Using existing database connection');
        return this.connection;
      }

      // Configuración optimizada para MongoDB Atlas
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4, // Usar IPv4
        bufferCommands: false,
        retryWrites: true,
        w: 'majority'
      };

      // Usar la URI de MongoDB Atlas proporcionada
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI no está configurado en las variables de entorno');
      }

      console.log('🔄 Conectando a MongoDB Atlas...');
      console.log('🌐 Cluster: mypersonalblog.jiu416h.mongodb.net');
      
      this.connection = await mongoose.connect(mongoUri, options);
      
      console.log('✅ Connected to MongoDB Atlas successfully');
      console.log(`📊 Database: ${this.connection.connection.name}`);
      console.log(`🌐 Host: ${this.connection.connection.host}`);
      console.log(`🔗 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
      
      // Configurar eventos de conexión
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('🔌 MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      mongoose.connection.on('connecting', () => {
        console.log('🔄 MongoDB connecting...');
      });

      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB connected');
      });
      
      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB Atlas connection error:', error.message);
      
      // Mostrar ayuda específica para MongoDB Atlas
      this.showAtlasConnectionHelp(error);
      process.exit(1);
    }
  }

  showAtlasConnectionHelp(error) {
    console.log('\n💡 SOLUCIONES PARA MONGODB ATLAS:');
    
    if (error.message.includes('authentication failed')) {
      console.log('\n🔐 ERROR DE AUTENTICACIÓN:');
      console.log('   1. Verifica que el usuario y contraseña sean correctos');
      console.log('   2. Ve a MongoDB Atlas > Database Access');
      console.log('   3. Verifica que el usuario "mypersonalblog255" existe');
      console.log('   4. Verifica que la contraseña sea correcta');
    }
    
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log('\n🌐 ERROR DE IP:');
      console.log('   1. Ve a MongoDB Atlas > Network Access');
      console.log('   2. Agrega tu IP actual a la lista blanca');
      console.log('   3. O permite acceso desde cualquier IP (0.0.0.0/0) para desarrollo');
    }
    
    if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
      console.log('\n🔗 ERROR DE CONEXIÓN:');
      console.log('   1. Verifica tu conexión a internet');
      console.log('   2. Verifica que el cluster esté activo en MongoDB Atlas');
      console.log('   3. Intenta conectar desde MongoDB Compass con la misma URI');
    }
    
    console.log('\n🔧 CONFIGURACIÓN ACTUAL:');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'Configurado' : 'No configurado'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log('\n📞 SOPORTE:');
    console.log('   Si el problema persiste, verifica en MongoDB Atlas Dashboard');
    console.log('   que el cluster esté activo y accesible.');
    console.log('\n');
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log('🔌 Disconnected from MongoDB Atlas');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB Atlas:', error.message);
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  // Método para verificar el estado de la conexión
  getConnectionStatus() {
    const states = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };
    
    return {
      state: states[mongoose.connection.readyState],
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      port: mongoose.connection.port
    };
  }
}

module.exports = new Database();