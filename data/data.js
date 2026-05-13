
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
      ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect().then(client => {
    console.log('Database connected successfully');
    client.release();
}).catch(err => {
 
    console.error('Error connecting to the database:', err);
});

module.exports = pool;