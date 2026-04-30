const express = require('express');
const router = express.Router();

const authController       = require('../controllers/authController');
const dashboardController  = require('../controllers/dashboardController');
const studentController    = require('../controllers/studentController');
const roomController       = require('../controllers/roomController');
const allocationController = require('../controllers/allocationController');
const { isLoggedIn }       = require('../middleware/auth');

// ── Auth (public)
router.get('/login',  authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/logout', authController.logout);

// ── All routes below require login
router.use(isLoggedIn);

// Dashboard
router.get('/',          dashboardController.getDashboard);
router.post('/generate', allocationController.generatePlan);

// Students
router.get('/manage-students',     studentController.manageStudents);
router.post('/add-student-single', studentController.addStudent);
router.post('/bulk-upload',        studentController.bulkUploadStudents);
router.post('/find-student-room',  studentController.findStudentRoom);

// Rooms
router.get('/manage-rooms',     roomController.manageRooms);
router.post('/add-room-single', roomController.addRoom);
router.post('/bulk-rooms',      roomController.bulkUploadRooms);

// History & Allocations
router.get('/history',               allocationController.getHistory);
router.post('/reprint-paper',        allocationController.reprintPaper);
router.get('/delete-allocation/:id', allocationController.deleteAllocation);
router.get('/clear-history',         allocationController.clearHistory);

// Swap
router.post('/get-swap-details', allocationController.getSwapDetails);
router.post('/swap-room',        allocationController.swapRoomAction);

module.exports = router;