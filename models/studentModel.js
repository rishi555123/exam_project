const db = require('../config/db');

const Student = {
    getAll: async (conds = "") => {
        let q = 'SELECT * FROM students';
        // Searching and Filtering logic ikkada add avthundi
        if (conds) {
            q += ' WHERE ' + conds;
        }
        q += ' ORDER BY year, branch, roll_no LIMIT 500';
        const [rows] = await db.query(q);
        return rows;
    },

    addBulk: async (values) => {
        return db.query('INSERT INTO students (roll_no, name, year, branch) VALUES ?', [values]);
    },
    delete: async (id) => {
        return db.query('DELETE FROM students WHERE id = ?', [id]);
    }
};

module.exports = Student;