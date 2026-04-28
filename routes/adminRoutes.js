const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');

router.get('/', allocationController.getDashboard);
router.post('/generate', allocationController.generatePlan);
router.get('/manage-students', allocationController.manageStudents);
router.post('/add-student-single', allocationController.addStudent);
router.post('/bulk-upload', allocationController.bulkUploadStudents);
router.get('/manage-rooms', allocationController.manageRooms);
router.post('/add-room-single', allocationController.addRoom);
router.post('/bulk-rooms', allocationController.bulkUploadRooms);
router.get('/history', allocationController.getHistory);
router.post('/reprint-paper', allocationController.reprintPaper);
router.get('/delete-allocation/:id', allocationController.deleteAllocation);
router.post('/find-student-room', allocationController.findStudentRoom);
router.post('/get-swap-details', allocationController.getSwapDetails);
router.post('/swap-room', allocationController.swapRoomAction);

// NEW: Clear History Route
router.get('/clear-history', allocationController.clearHistory);

module.exports = router;