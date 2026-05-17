const path = require('path');
require('dotenv').config();
module.exports = {
  env: process.env.NODE_ENV ,
  port: process.env.PORT ,
  db: {
    host: process.env.DATABASE_HOST ,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER ,
    password: process.env.DATABASE_PASSWORD ,
    database: process.env.DATABASE_NAME ,
    max: Number(process.env.DATABASE_MAX_POOL_SIZE ),
    idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT)
  },
  jwt: {
    secret: process.env.JWT_SECRET ,
    expiresIn: process.env.JWT_EXPIRES_IN 
  }
};
