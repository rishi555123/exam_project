// controllers/roomController.js
const db = require('../config/db');
const Room = require('../models/roomModel');

exports.manageRooms = async (req, res) => {
    try {
        const rooms = await Room.getAll();
        res.render('rooms', { rooms });
    } catch (err) {
        console.error('Manage Rooms Error:', err);
        res.status(500).send('Error loading rooms.');
    }
};

exports.addRoom = async (req, res) => {
    try {
        const { r_num, cap } = req.body;
        if (!r_num || !cap) return res.status(400).send('Room number and capacity required.');
        await db.query(
            'INSERT INTO rooms (room_number, capacity) VALUES (?, ?)',
            [r_num.trim(), parseInt(cap)]
        );
        res.redirect('/manage-rooms');
    } catch (err) {
        console.error('Add Room Error:', err);
        res.status(500).send('Error adding room.');
    }
};

exports.bulkUploadRooms = async (req, res) => {
    try {
        const data = req.body.room_data.trim();
        if (data) {
            const values = data.split('\n')
                .map(l => l.split(',').map(s => s.trim()))
                .filter(row => row.length === 2 && row.every(v => v)); // skip malformed rows
            if (values.length > 0) await Room.addBulk(values);
        }
        res.redirect('/manage-rooms');
    } catch (err) {
        console.error('Bulk Rooms Error:', err);
        res.status(500).send('Bulk upload failed: ' + err.message);
    }
};