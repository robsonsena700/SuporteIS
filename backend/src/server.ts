import app from './app';
import dotenv from 'dotenv';
import { pool } from './config/database';
import https from 'https';
import fs from 'fs';
import path from 'path';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('Attempting to connect to DB...');
    // Test DB Connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL Database');
    client.release();

    if (process.env.USE_HTTP === 'true') {
      const http = require('http');
      const server = http.createServer(app).listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT} (HTTP)`);
        console.log(`📄 Documentation available at http://localhost:${PORT}/api-docs`);
      });
    } else {
      const certPath = path.join(__dirname, '../certs');
      const httpsOptions = {
          key: fs.readFileSync(path.join(certPath, 'server.key')),
          cert: fs.readFileSync(path.join(certPath, 'server.cert'))
      };

      const server = https.createServer(httpsOptions, app).listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 Secure Server running on port ${PORT} (HTTPS)`);
        console.log(`📄 Documentation available at https://localhost:${PORT}/api-docs`);
      });
      
      server.on('close', () => {
          console.log('Server closed');
      });
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT');
    process.exit(0);
});

startServer();
