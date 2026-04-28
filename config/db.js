const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Rishi@2006',
    database: 'exam_system',
    waitForConnections: true,
    connectionLimit: 10
}).promise(); // Promise valla code inka clean ga untundi

module.exports = db;