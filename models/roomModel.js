const db = require('../config/db');

const Room = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM rooms ORDER BY room_number ASC');
        return rows;
    },
    addBulk: async (values) => {
        return db.query('INSERT INTO rooms (room_number, capacity) VALUES ?', [values]);
    },
    delete: async (id) => {
        return db.query('DELETE FROM rooms WHERE id = ?', [id]);
    }
};

module.exports = Room;