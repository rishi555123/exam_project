const Student = require('../models/studentModel');
const Room = require('../models/roomModel');
const db = require('../config/db');

// 1. DASHBOARD
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
    } catch (err) { res.status(500).send("Dashboard Error: " + err.message); }
};

// 2. GENERATE PLAN
exports.generatePlan = async (req, res) => {
    try {
        const { exam_date, exam_session, selected_year, selected_branches, selected_rooms, jumble_mode } = req.body;
        const brIds = Array.isArray(selected_branches) ? selected_branches : [selected_branches];
        const rmIds = Array.isArray(selected_rooms) ? selected_rooms : [selected_rooms];

        const [allStudents] = await db.query(
            "SELECT roll_no, name, year, branch FROM students WHERE year = ? AND branch IN (?) ORDER BY branch, roll_no ASC", 
            [selected_year, brIds]
        );

        let studentsToPlace = [];
        if (jumble_mode === 'true') {
            let branchGroups = {};
            brIds.forEach(br => { branchGroups[br] = allStudents.filter(s => s.branch === br); });
            let maxCount = Math.max(...Object.values(branchGroups).map(g => g.length));
            for (let i = 0; i < maxCount; i++) {
                brIds.forEach(br => { if (branchGroups[br][i]) studentsToPlace.push(branchGroups[br][i]); });
            }
        } else {
            studentsToPlace = allStudents;
        }

        const [rooms] = await db.query("SELECT * FROM rooms WHERE id IN (?) ORDER BY room_number ASC", [rmIds]);
        const totalAvailableCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);

        if (studentsToPlace.length > totalAvailableCapacity) {
            return res.send(`<div style="background:#0f172a;color:white;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;"><div><h2 style="color:#ef4444;">INSUFFICIENT CAPACITY</h2><p>Students: ${studentsToPlace.length} | Capacity: ${totalAvailableCapacity}</p><a href="/" style="color:white;text-decoration:underline;">Go Back</a></div></div>`);
        }

        const bookings = [];
        let sIdx = 0;
        let pagesHtml = "";
        let attendanceHtml = "";
        const yrColors = { 1: 'bg-blue-50', 2: 'bg-emerald-50', 3: 'bg-amber-50', 4: 'bg-violet-50' };

        for (let room of rooms) {
            if (sIdx >= studentsToPlace.length) break;
            let rStudents = studentsToPlace.slice(sIdx, sIdx + room.capacity);
            if (rStudents.length > 0) {
                bookings.push([room.id, exam_date, exam_session, brIds.join(', '), selected_year, rStudents[0].roll_no]);
                
                pagesHtml += `<div class="a4-page italic font-black shadow-2xl"><div class="border-[6px] border-double border-slate-900 p-6 text-center mb-8 uppercase"><h1 class="text-2xl tracking-tighter">Gokaraju Rangaraju Institute of Engineering and Technology</h1><p class="text-[10px] mt-2 tracking-[0.4em]">EXAM DATE: ${exam_date}</p></div><div class="flex justify-between bg-slate-950 text-white p-5 rounded-2xl mb-10 uppercase text-xs"><span>ROOM: ${room.room_number}</span><span>SESSION: ${exam_session}</span><span>COUNT: ${rStudents.length}</span></div><div class="grid grid-cols-6 gap-3">${rStudents.map(s => `<div class="border-2 border-slate-100 p-2 h-24 text-center flex flex-col justify-center rounded-2xl ${yrColors[s.year] || 'bg-slate-50'}"><span class="text-[11px] font-black">${s.roll_no}</span><span class="text-[6px] truncate text-slate-400 uppercase">${s.name}</span><div class="text-[7px] text-indigo-600 uppercase">${s.branch} | ${s.year}YR</div></div>`).join('')}</div></div>`;
                
                attendanceHtml += `<div class="a4-page italic font-black shadow-2xl"><div class="border-[6px] border-double border-slate-900 p-6 text-center mb-6 uppercase"><h1 class="text-2xl tracking-tighter">Gokaraju Rangaraju Institute of Engineering and Technology</h1><p class="text-[10px] mt-2 tracking-[0.4em]">ATTENDANCE - ${exam_session}</p></div><table class="w-full border-collapse border-2 border-slate-900 text-[9px]"><thead><tr class="bg-slate-900 text-white uppercase text-center"><th class="border p-2">S.No</th><th class="border p-2">Roll</th><th class="border p-2">Name</th><th class="border p-2">Sign</th></tr></thead><tbody>${rStudents.map((s, idx) => `<tr class="border-b border-slate-900"><td class="border p-1.5 text-center">${idx + 1}</td><td class="border p-1.5 font-black text-center">${s.roll_no}</td><td class="border p-1.5 uppercase">${s.name}</td><td class="border p-1.5 h-8"></td></tr>`).join('')}</tbody></table></div>`;
            }
            sIdx += room.capacity;
        }

        if (bookings.length > 0) {
            await db.query('INSERT INTO room_allocations (room_id, exam_date, exam_session, branch, year, start_roll_no) VALUES ?', [bookings]);
        }
        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>.a4-page{background:white;width:210mm;min-height:297mm;padding:15mm;margin:40px auto;page-break-after:always;}@media print{.no-print{display:none!important;}.a4-page{margin:0;box-shadow:none;width:100%;height:100%;padding:10mm;}}</style></head><body class="bg-slate-900"><div class="no-print p-4 flex justify-center gap-4 sticky top-0 bg-slate-950 z-50"><a href="/history" class="bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-black">Back</a><button onclick="window.print()" class="bg-indigo-600 text-white px-10 py-2 rounded-xl text-xs font-black italic">Print All</button></div>${pagesHtml}${attendanceHtml}</body></html>`);
    } catch (err) { res.status(500).send("Generation Failed: " + err.message); }
};

// 3. REPRINT PAPER
exports.reprintPaper = async (req, res) => {
    try {
        const { room_id, date, session } = req.body;
        const d = new Date(date);
        const formattedDate = d.toISOString().split('T')[0];

        const [alloc] = await db.query(
            `SELECT ra.*, r.room_number, r.capacity FROM room_allocations ra 
             JOIN rooms r ON ra.room_id = r.id 
             WHERE ra.room_id = ? AND ra.exam_date = ? AND ra.exam_session = ?`, 
            [room_id, formattedDate, session]
        );

        if (!alloc || alloc.length === 0) return res.status(404).send("Allocation not found.");

        const { branch, year, capacity, room_number } = alloc[0];

        const [prev] = await db.query(
            `SELECT COUNT(*) as count FROM room_allocations 
             WHERE branch = ? AND year = ? AND exam_date = ? AND exam_session = ? 
             AND room_id < ?`,
            [branch, year, formattedDate, session, room_id]
        );

        const skip = prev[0].count * capacity;
        const [students] = await db.query(
            `SELECT roll_no, name, year, branch FROM students 
             WHERE branch = ? AND year = ? 
             ORDER BY roll_no ASC LIMIT ? OFFSET ?`, 
            [branch, year, capacity, skip]
        );

        const yrColors = { 1: 'bg-blue-50', 2: 'bg-emerald-50', 3: 'bg-amber-50', 4: 'bg-violet-50' };

        let seatingHtml = `<div class="a4-page italic font-black"><div class="border-[6px] border-double border-slate-900 p-6 text-center mb-8 uppercase"><h1 class="text-2xl tracking-tighter">Gokaraju Rangaraju Institute of Engineering and Technology</h1><p class="text-[10px] mt-2 tracking-[0.4em]">DATE: ${formattedDate}</p></div><div class="flex justify-between bg-slate-950 text-white p-5 rounded-2xl mb-10 text-xs"><span>HALL: ${room_number}</span><span>SESSION: ${session}</span><span>COUNT: ${students.length}</span></div><div class="grid grid-cols-6 gap-3">${students.map(s => `<div class="border-2 border-slate-100 p-2 h-24 text-center flex flex-col justify-center rounded-2xl ${yrColors[s.year] || 'bg-slate-50'}"><span class="text-[11px] font-black">${s.roll_no}</span><span class="text-[6px] truncate text-slate-400 uppercase">${s.name}</span><div class="text-[7px] text-indigo-600 uppercase">${s.branch} | ${s.year}YR</div></div>`).join('')}</div></div>`;

        let attendanceHtml = `<div class="a4-page italic font-black"><div class="border-[6px] border-double border-slate-900 p-6 text-center mb-6 uppercase"><h1 class="text-2xl tracking-tighter">Gokaraju Rangaraju Institute of Engineering and Technology</h1><p class="text-[10px] mt-2 tracking-[0.4em]">ATTENDANCE - ${session}</p></div><table class="w-full border-collapse border-2 border-slate-900 text-[9px]"><thead><tr class="bg-slate-900 text-white uppercase text-center"><th class="border p-2">S.No</th><th class="border p-2">Roll</th><th class="border p-2">Name</th><th class="border p-2">Sign</th></tr></thead><tbody>${students.map((s, idx) => `<tr class="border-b border-slate-900"><td class="border p-1.5 text-center">${idx + 1}</td><td class="border p-1.5 font-black text-center">${s.roll_no}</td><td class="border p-1.5 uppercase">${s.name}</td><td class="border p-1.5 h-8"></td></tr>`).join('')}</tbody></table></div>`;

        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>.a4-page{background:white;width:210mm;min-height:297mm;padding:15mm;margin:40px auto;page-break-after:always;}@media print{.no-print{display:none!important;}.a4-page{margin:0;}}</style></head><body class="bg-slate-900"><div class="no-print p-4 flex justify-center gap-4 sticky top-0 bg-slate-950 z-50"><button onclick="window.print()" class="bg-indigo-600 text-white px-12 py-3 rounded-xl font-black italic shadow-2xl">Print Document</button></div>${seatingHtml}${attendanceHtml}</body></html>`);
    } catch (err) { res.status(500).send("Reprint Error: " + err.message); }
};

// 4. CLEAR HISTORY
exports.clearHistory = async (req, res) => {
    try { await db.query("DELETE FROM room_allocations"); res.redirect('/history'); } catch (err) { res.status(500).send(err.message); }
};

// 5. HISTORY
exports.getHistory = async (req, res) => {
    try {
        const searchDate = req.query.searchDate || "";
        let q = "SELECT ra.*, r.room_number FROM room_allocations ra JOIN rooms r ON ra.room_id = r.id";
        if (searchDate) q += " WHERE ra.exam_date = '" + searchDate + "'";
        const [records] = await db.query(q + " ORDER BY ra.exam_date DESC, r.room_number ASC");
        res.render('history', { records, searchDate });
    } catch (err) { res.status(500).send(err.message); }
};

// 6. MANAGE STUDENTS
exports.manageStudents = async (req, res) => {
    try {
        const yr = req.query.year; const br = req.query.branch; const search = req.query.search || '';
        let conds = [];
        if (yr) conds.push("year = " + yr); if (br) conds.push("branch = '" + br + "'");
        if (search) conds.push("(roll_no LIKE '%" + search + "%' OR name LIKE '%" + search + "%')");
        const students = await Student.getAll(conds.length > 0 ? conds.join(' AND ') : "");
        res.render('registry', { students, branches: ['CSE', 'AIML', 'CSDS', 'MECH', 'CIVIL', 'ECE'], yr, br, search });
    } catch (err) { res.status(500).send(err.message); }
};

exports.findStudentRoom = async (req, res) => {
    try {
        const { roll_no, date, session } = req.body;
        const cleanRoll = roll_no.trim().toUpperCase();

        // 1. Verify student exists
        const [student] = await db.execute(
            'SELECT branch, year FROM students WHERE UPPER(roll_no) = ?',
            [cleanRoll]
        );

        if (student.length === 0) {
            return res.json({ success: false, message: 'Student not found in registry. Check the roll number.' });
        }

        const { branch, year } = student[0];

        // 2. Get all allocations for this date/session that include this student's branch+year,
        //    ordered by allocation id (same order rooms were filled during generatePlan)
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

        // 3. For each hall, get the actual students placed in it (in the same order as generatePlan)
        //    by fetching students ordered by branch,roll_no from start_roll_no offset
        //    We do this by finding the position of start_roll_no and slicing capacity students
        
        // Get all students for this branch+year sorted exactly like generatePlan does
        const [allStudents] = await db.execute(
            `SELECT roll_no FROM students
             WHERE branch = ? AND year = ?
             ORDER BY branch, roll_no ASC`,
            [branch, year]
        );

        const allRolls = allStudents.map(s => s.roll_no.toUpperCase());
        const studentIndex = allRolls.indexOf(cleanRoll);

        if (studentIndex === -1) {
            return res.json({ success: false, message: 'Student found in registry but roll number mismatch. Contact admin.' });
        }

        // 4. Walk through halls and find which one covers studentIndex
        let offset = 0;
        let assignedRoom = null;

        for (let hall of halls) {
            const startRoll = hall.start_roll_no.toUpperCase();
            const startIndex = allRolls.indexOf(startRoll);

            // Use start_roll_no to anchor the offset for the first hall
            if (offset === 0 && startIndex !== -1) {
                offset = startIndex;
            }

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
        console.error("Finder Error:", error);
        res.status(500).json({ success: false, message: 'Database error: ' + error.message });
    }
};

// 8. SWAP & BULK
exports.swapRoomAction = async (req, res) => {
    try { await db.query("UPDATE room_allocations SET room_id = ? WHERE id = ?", [req.body.new_room_id, req.body.allocation_id]); res.json({ success: true }); } catch (err) { res.json({ success: false, message: err.message }); }
};

exports.getSwapDetails = async (req, res) => {
    try {
        const { room_number, date, session } = req.body;
        const [room] = await db.query("SELECT id FROM rooms WHERE room_number = ?", [room_number]);
        if (room.length === 0) return res.json({ success: false, message: "Invalid Room!" });
        const [alloc] = await db.query(`SELECT id, branch, year FROM room_allocations WHERE room_id = ? AND DATE(exam_date) = ? AND exam_session = ?`, [room[0].id, date, session]);
        if (alloc.length === 0) return res.json({ success: false, message: "No allocation!" });
        const [avail] = await db.query(`SELECT * FROM rooms WHERE id NOT IN (SELECT room_id FROM room_allocations WHERE DATE(exam_date) = ? AND exam_session = ?)`, [date, session]);
        res.json({ success: true, allocation: alloc[0], availableRooms: avail });
    } catch (err) { res.json({ success: false, message: err.message }); }
};

exports.addStudent = async (req, res) => { await db.query('INSERT INTO students (roll_no, name, year, branch) VALUES (?, ?, ?, ?)', [req.body.roll, req.body.name, req.body.year, req.body.branch]); res.redirect('/manage-students'); };
exports.bulkUploadStudents = async (req, res) => { const v = req.body.csv_data.trim().split('\n').map(l => l.split(',').map(s => s.trim())); if(v.length > 0) await Student.addBulk(v); res.redirect('/manage-students'); };
exports.manageRooms = async (req, res) => { const rooms = await Room.getAll(); res.render('rooms', { rooms }); };
exports.addRoom = async (req, res) => { await db.query('INSERT INTO rooms (room_number, capacity) VALUES (?, ?)', [req.body.r_num, req.body.cap]); res.redirect('/manage-rooms'); };
exports.bulkUploadRooms = async (req, res) => { try { const data = req.body.room_data.trim(); if(data) { const v = data.split('\n').map(l => l.split(',').map(s => s.trim())); await Room.addBulk(v); } res.redirect('/manage-rooms'); } catch (err) { res.status(500).send(err.message); } };
exports.deleteAllocation = async (req, res) => { await db.query("DELETE FROM room_allocations WHERE id = ?", [req.params.id]); res.redirect('/history'); };