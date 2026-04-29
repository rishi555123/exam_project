const mysql = require('mysql2');

const db = mysql.createPool({
    // Render lo manam set chese Environment Variables nundi details teesukuntundi
    host: process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    // Cloud Databases (like Aiven/TiDB) ki SSL chala important
    ssl: {
        rejectUnauthorized: false
    }
}).promise();

module.exports = db;