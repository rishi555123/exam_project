const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');

// Dashboard Routes
router.get('/', allocationController.getDashboard);
router.post('/generate', allocationController.generatePlan);

// Registry Routes
router.get('/manage-students', allocationController.manageStudents);
router.post('/add-student-single', allocationController.addStudent);
router.post('/bulk-upload', allocationController.bulkUploadStudents);

// Room Routes
router.get('/manage-rooms', allocationController.manageRooms);
router.post('/add-room-single', allocationController.addRoom);
router.post('/bulk-rooms', allocationController.bulkUploadRooms);

// History & Archive Routes
router.get('/history', allocationController.getHistory);
router.post('/reprint-paper', allocationController.reprintPaper);
router.get('/delete-allocation/:id', allocationController.deleteAllocation);

module.exports = router;