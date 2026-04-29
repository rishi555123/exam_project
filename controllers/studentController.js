// controllers/studentController.js
const db = require('../config/db');
const Student = require('../models/studentModel');

const BRANCHES = ['CSE', 'AIML', 'CSDS', 'MECH', 'CIVIL', 'ECE'];

exports.manageStudents = async (req, res) => {
    try {
        const yr = req.query.year ? parseInt(req.query.year) : null;
        const br = req.query.branch || null;
        const search = req.query.search ? req.query.search.trim() : '';

        // Validate branch against whitelist — prevents injection via branch param
        const safeBranch = br && BRANCHES.includes(br.toUpperCase()) ? br.toUpperCase() : null;

        // Build parameterized query — NO string concatenation
        let q = 'SELECT * FROM students WHERE 1=1';
        const params = [];

        if (yr) { q += ' AND year = ?'; params.push(yr); }
        if (safeBranch) { q += ' AND branch = ?'; params.push(safeBranch); }
        if (search) { q += ' AND (roll_no LIKE ? OR name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

        q += ' ORDER BY year, branch, roll_no LIMIT 500';

        const [students] = await db.query(q, params);
        res.render('registry', { students, branches: BRANCHES, yr, br: safeBranch, search });
    } catch (err) {
        console.error('Manage Students Error:', err);
        res.status(500).send('Error loading students.');
    }
};

exports.addStudent = async (req, res) => {
    try {
        const { roll, name, year, branch } = req.body;
        if (!roll || !name || !year || !branch) return res.status(400).send('All fields required.');
        await db.query(
            'INSERT INTO students (roll_no, name, year, branch) VALUES (?, ?, ?, ?)',
            [roll.trim().toUpperCase(), name.trim(), parseInt(year), branch.trim().toUpperCase()]
        );
        res.redirect('/manage-students');
    } catch (err) {
        console.error('Add Student Error:', err);
        res.status(500).send('Error adding student.');
    }
};

exports.bulkUploadStudents = async (req, res) => {
    try {
        const lines = req.body.csv_data.trim().split('\n');
        const values = lines
            .map(l => l.split(',').map(s => s.trim()))
            .filter(row => row.length === 4 && row.every(v => v)); // skip malformed rows
        if (values.length > 0) await Student.addBulk(values);
        res.redirect('/manage-students');
    } catch (err) {
        console.error('Bulk Upload Error:', err);
        res.status(500).send('Bulk upload failed: ' + err.message);
    }
};

exports.findStudentRoom = async (req, res) => {
    try {
        const { roll_no, date, session } = req.body;
        const cleanRoll = roll_no.trim().toUpperCase();

        const [student] = await db.execute(
            'SELECT branch, year FROM students WHERE UPPER(roll_no) = ?',
            [cleanRoll]
        );

        if (student.length === 0) {
            return res.json({ success: false, message: 'Student not found in registry. Check the roll number.' });
        }

        const { branch, year } = student[0];

        const [halls] = await db.execute(
            `SELECT r.room_number, r.capacity, ra.start_roll_no, ra.id
             FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id
             WHERE ra.exam_date = ? AND ra.exam_session = ?
             AND ra.branch LIKE ? AND ra.year = ?
             ORDER BY ra.id ASC`,
            [date, session, `%${branch}%`, year]
        );

        if (halls.length === 0) {
            return res.json({ success: false, message: 'No exam allocation found for this date and session.' });
        }

        const [allStudents] = await db.execute(
            'SELECT roll_no FROM students WHERE branch = ? AND year = ? ORDER BY branch, roll_no ASC',
            [branch, year]
        );

        const allRolls = allStudents.map(s => s.roll_no.toUpperCase());
        const studentIndex = allRolls.indexOf(cleanRoll);

        if (studentIndex === -1) {
            return res.json({ success: false, message: 'Roll number mismatch. Contact admin.' });
        }

        let offset = 0;
        let assignedRoom = null;

        for (let hall of halls) {
            const startRoll = hall.start_roll_no.toUpperCase();
            const startIndex = allRolls.indexOf(startRoll);
            if (offset === 0 && startIndex !== -1) offset = startIndex;

            const hallEnd = offset + hall.capacity - 1;
            if (studentIndex >= offset && studentIndex <= hallEnd) {
                assignedRoom = hall.room_number;
                break;
            }
            offset = hallEnd + 1;
        }

        if (assignedRoom) {
            res.json({ success: true, room: assignedRoom });
        } else {
            res.json({ success: false, message: 'Student is registered but not allocated for this date/session.' });
        }
    } catch (error) {
        console.error('Finder Error:', error);
        res.status(500).json({ success: false, message: 'Database error.' });
    }
};