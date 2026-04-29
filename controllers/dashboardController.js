// controllers/dashboardController.js
const Room = require('../models/roomModel');
const db = require('../config/db');

exports.getDashboard = async (req, res) => {
    try {
        const selDate = req.query.date || new Date().toISOString().split('T')[0];
        const selSession = req.query.session || 'FN';

        const [totalRes] = await db.query('SELECT COUNT(*) as totalStudents FROM students');
        const totalStudents = totalRes[0].totalStudents || 0;

        const [allocations] = await db.query(
            'SELECT room_id FROM room_allocations WHERE exam_date = ? AND exam_session = ?',
            [selDate, selSession]
        );

        let allocatedCount = 0;
        if (allocations.length > 0) {
            const roomIds = allocations.map(a => a.room_id);
            const [capRes] = await db.query('SELECT SUM(capacity) as sumCap FROM rooms WHERE id IN (?)', [roomIds]);
            allocatedCount = capRes[0].sumCap || 0;
        }

        const percent = totalStudents > 0 ? Math.round((allocatedCount / totalStudents) * 100) : 0;
        const rooms = await Room.getAll();
        const [sStats] = await db.query('SELECT year, branch, COUNT(*) as count FROM students GROUP BY year, branch');

        const stats = {};
        sStats.forEach(s => {
            if (!stats[s.year]) stats[s.year] = { total: 0, branches: {} };
            stats[s.year].branches[s.branch] = s.count;
            stats[s.year].total += s.count;
        });

        res.render('dashboard', {
            selDate, selSession, rooms, stats, totalStudents, allocatedCount, percent,
            bookedIds: allocations.map(a => a.room_id)
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        res.status(500).send('Dashboard Error. Please try again.');
    }
};