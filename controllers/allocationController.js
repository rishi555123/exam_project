const Student = require('../models/studentModel');
const Room = require('../models/roomModel');
const db = require('../config/db');

// 1. DASHBOARD
exports.getDashboard = async (req, res) => {
    try {
        const selDate = req.query.date || new Date().toISOString().split('T')[0];
        const selSession = req.query.session || 'FN';

        // 1. Total Students Count
        const [totalRes] = await db.query('SELECT COUNT(*) as totalStudents FROM students');
        const totalStudents = totalRes[0].totalStudents || 0;

        // 2. Currently Allocated Students for selected date & session
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

        // 3. Percentage Calculation
        const percent = totalStudents > 0 ? Math.round((allocatedCount / totalStudents) * 100) : 0;

        const rooms = await Room.getAll();
        const [sStats] = await db.query('SELECT year, branch, COUNT(*) as count FROM students GROUP BY year, branch');
        
        const stats = {};
        sStats.forEach(s => { 
            if (!stats[s.year]) stats[s.year] = { total: 0, branches: {} }; 
            stats[s.year].branches[s.branch] = s.count; 
            stats[s.year].total += s.count; 
        });

        // CRITICAL: EJS ki variables anni pampali
        res.render('dashboard', { 
            selDate, 
            selSession, 
            rooms, 
            stats, 
            totalStudents, 
            allocatedCount, 
            percent,
            bookedIds: allocations.map(a => a.room_id)
        });
    } catch (err) { res.status(500).send("Dashboard Error: " + err.message); }
};

// 2. GENERATE PLAN (With Alternate Seating Logic)
exports.generatePlan = async (req, res) => {
    try {
        const { exam_date, exam_session, selected_year, selected_branches, selected_rooms, jumble_mode } = req.body;
        const brIds = Array.isArray(selected_branches) ? selected_branches : [selected_branches];
        const rmIds = Array.isArray(selected_rooms) ? selected_rooms : [selected_rooms];

        // 1. Fetch Students
        const [allStudents] = await db.query(
            "SELECT roll_no, name, year, branch FROM students WHERE year = ? AND branch IN (?) ORDER BY branch, roll_no ASC", 
            [selected_year, brIds]
        );

        // --- NEW: JUMBLE LOGIC (Alternate Branch Placement) ---
        let studentsToPlace = [];
        
        if (jumble_mode === 'true') {
            // Group students by branch
            let branchGroups = {};
            brIds.forEach(br => {
                branchGroups[br] = allStudents.filter(s => s.branch === br);
            });

            // Find the branch with the maximum number of students to set the loop limit
            let maxCount = Math.max(...Object.values(branchGroups).map(g => g.length));

            // Interleave (Zip) students from different branches
            for (let i = 0; i < maxCount; i++) {
                brIds.forEach(br => {
                    if (branchGroups[br][i]) {
                        studentsToPlace.push(branchGroups[br][i]);
                    }
                });
            }
        } else {
            // Standard placement (Sequential by branch)
            studentsToPlace = allStudents;
        }

        // 2. Fetch Selected Rooms
        const [rooms] = await db.query("SELECT * FROM rooms WHERE id IN (?) ORDER BY room_number ASC", [rmIds]);
        const totalAvailableCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);

        // Capacity Validation
        if (studentsToPlace.length > totalAvailableCapacity) {
            return res.send(`
                <div style="font-family: 'Lexend', sans-serif; background: #0f172a; height: 100vh; display: flex; align-items: center; justify-content: center; color: white; text-align: center;">
                    <div style="background: #1e293b; padding: 3rem; border-radius: 2rem; border: 4px solid #ef4444; max-width: 500px;">
                        <h2 style="color: #ef4444; font-weight: 900;">INSUFFICIENT CAPACITY</h2>
                        <p style="color: #94a3b8;">Students: ${studentsToPlace.length} | Capacity: ${totalAvailableCapacity}</p>
                        <a href="/" style="background: #ef4444; color: white; padding: 1rem 2.5rem; border-radius: 1rem; text-decoration: none; display: inline-block; margin-top: 1rem;">Go Back</a>
                    </div>
                </div>
            `);
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
                // Save first roll number of the room for reprinting/history
                bookings.push([room.id, exam_date, exam_session, brIds.join(', '), selected_year, rStudents[0].roll_no]);

                // 1. SEATING CHART HTML (Same as before but with interleaved rStudents)
                pagesHtml += `
                <div class="a4-page italic font-black shadow-2xl">
                    <div class="border-[6px] border-double border-slate-900 p-6 text-center mb-8 uppercase">
                        <h1 class="text-2xl tracking-tighter">GOKARAJU RANGARAJU INSTITUTE OF ENGINEERING AND TECHNOLOGY</h1>
                        <p class="text-[10px] mt-2 tracking-[0.4em]">EXAM DATE: ${exam_date}</p>
                    </div>
                    <div class="flex justify-between bg-slate-950 text-white p-5 rounded-2xl mb-10 uppercase text-xs">
                        <span>ROOM: ${room.room_number}</span>
                        <span>SESSION: ${exam_session}</span>
                        <span>COUNT: ${rStudents.length}</span>
                    </div>
                    <div class="grid grid-cols-6 gap-3">
                        ${rStudents.map(s => {
                            const bgColor = yrColors[parseInt(s.year)] || 'bg-slate-50';
                            return `
                            <div class="border-2 border-slate-100 p-2 h-24 text-center flex flex-col justify-center rounded-2xl relative ${bgColor}">
                                <span class="text-[11px] font-black text-slate-900">${s.roll_no}</span>
                                <span class="text-[6px] truncate font-bold text-slate-400 uppercase mt-1 px-1">${s.name}</span>
                                <div class="mt-1 text-[7px]">
                                    <span class="font-black text-indigo-600 uppercase">${s.branch}</span>
                                    <span class="text-slate-500 font-bold"> | ${s.year}YR</span>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;

                // 2. ATTENDANCE SHEET HTML
                attendanceHtml += `
                <div class="a4-page italic font-black shadow-2xl">
                    <div class="border-[6px] border-double border-slate-900 p-6 text-center mb-6 uppercase">
                        <h1 class="text-2xl tracking-tighter">GOKARAJU RANGARAJU INSTITUTE OF ENGINEERING AND TECHNOLOGY</h1>
                        <p class="text-[10px] mt-2 tracking-[0.4em]">ATTENDANCE SHEET - ${exam_session} SESSION</p>
                    </div>
                    <div class="flex justify-between border-2 border-slate-900 p-4 rounded-xl mb-4 uppercase text-[10px] font-black">
                        <span>HALL: ${room.room_number}</span>
                        <span>DATE: ${exam_date}</span>
                        <span>STRENGTH: ${rStudents.length}</span>
                    </div>
                    <table class="w-full border-collapse border-2 border-slate-900 text-[9px]">
                        <thead>
                            <tr class="bg-slate-900 text-white uppercase text-center">
                                <th class="border border-slate-900 p-2 w-10">S.No</th>
                                <th class="border border-slate-900 p-2 w-32">Roll Number</th>
                                <th class="border border-slate-900 p-2 text-left">Student Name</th>
                                <th class="border border-slate-900 p-2 w-32">Signature</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rStudents.map((s, idx) => `
                            <tr class="border-b border-slate-900">
                                <td class="border border-slate-900 p-1.5 text-center font-bold">${idx + 1}</td>
                                <td class="border border-slate-900 p-1.5 font-black uppercase text-center">${s.roll_no}</td>
                                <td class="border border-slate-900 p-1.5 uppercase truncate text-left">${s.name}</td>
                                <td class="border border-slate-900 p-1.5 h-8"></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
            }
            sIdx += room.capacity;
        }

        if (bookings.length > 0) {
            await db.query('INSERT INTO room_allocations (room_id, exam_date, exam_session, branch, year, start_roll_no) VALUES ?', [bookings]);
        }
        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>.a4-page{background:white;width:210mm;min-height:297mm;padding:15mm;margin:40px auto;page-break-after:always;position:relative;}@media print{.no-print{display:none!important;}.a4-page{margin:0;box-shadow:none;width:100%;height:100%;padding:10mm;}}</style></head><body class="bg-slate-900"><div class="no-print p-4 flex justify-center gap-4 sticky top-0 bg-slate-950 z-50"><a href="/history" class="bg-slate-800 text-white px-6 py-2 rounded-xl text-xs uppercase font-black">Back</a><button onclick="window.print()" class="bg-indigo-600 text-white px-10 py-2 rounded-xl text-xs uppercase font-black italic shadow-2xl">Print All Documents</button></div>${pagesHtml}${attendanceHtml}</body></html>`);
    } catch (err) { res.status(500).send("Generation Failed: " + err.message); }
};

// 3. ACCURATE REPRINT (Fixed "No Record Found" & Formatting)
exports.reprintPaper = async (req, res) => {
    try {
        const { room_id, date, session } = req.body;
        
        // 1. Format the date correctly for the database query
        const d = new Date(date);
        const formattedDate = d.toISOString().split('T')[0];

        // 2. Fetch the specific allocation for this room/date/session
        const [alloc] = await db.query(
            `SELECT ra.*, r.room_number, r.capacity 
             FROM room_allocations ra 
             JOIN rooms r ON ra.room_id = r.id 
             WHERE ra.room_id = ? AND ra.exam_date = ? AND ra.exam_session = ?`, 
            [room_id, formattedDate, session]
        );

        if (!alloc || alloc.length === 0) {
            return res.status(404).send("No record found! Please clear history and generate a fresh plan.");[cite: 2]
        }

        const { branch, year, capacity, room_number } = alloc[0];

        // 3. THE MAGIC FIX: Calculate how many students to skip
        // Count how many halls for this SAME branch/year/session have a lower room_id
        const [previousHalls] = await db.query(
            `SELECT COUNT(*) as count FROM room_allocations 
             WHERE branch = ? AND year = ? AND exam_date = ? AND exam_session = ? 
             AND room_id < ?`,
            [branch, year, formattedDate, session, room_id]
        );

        const skipCount = previousHalls[0].count * capacity;

        // 4. Fetch the specific batch of students using LIMIT and OFFSET
        const [students] = await db.query(
            `SELECT roll_no, name, year, branch FROM students 
             WHERE branch = ? AND year = ? 
             ORDER BY roll_no ASC 
             LIMIT ? OFFSET ?`, 
            [branch, year, capacity, skipCount]
        );

        // 5. Define Year Colors for the UI
        const yrColors = { 
            1: 'bg-blue-50', 
            2: 'bg-emerald-50', 
            3: 'bg-amber-50', 
            4: 'bg-violet-50' 
        };

        // 6. Render the A4 print view[cite: 1]
        res.render('print-view', { 
            students, 
            room_number, 
            branch, 
            year, 
            date: formattedDate, 
            session,
            yrColors 
        });

    } catch (error) {
        console.error("Reprint Error:", error);
        res.status(500).send("Internal Server Error during printing.");
    }
};
        // --- SEATING CHART HTML ---
        let seatingHtml = `
        <div class="a4-page italic font-black shadow-2xl">
            <div class="border-[6px] border-double border-slate-900 p-6 text-center mb-8 uppercase">
                <h1 class="text-2xl tracking-tighter">GOKARAJU RANGARAJU INSTITUTE OF ENGINEERING AND TECHNOLOGY</h1>
                <p class="text-[10px] mt-2 tracking-[0.4em]">EXAM DATE: ${formattedDate}</p>
            </div>
            <div class="flex justify-between bg-slate-950 text-white p-5 rounded-2xl mb-10 uppercase text-xs">
                <span>HALL: ${roomData[0].room_number}</span>
                <span>SESSION: ${session}</span>
                <span>COUNT: ${students.length}</span>
            </div>
            <div class="grid grid-cols-6 gap-3">
                ${students.map(s => {
                    // FIXED: Color distinction using parseInt
                    const yearNum = parseInt(s.year);
                    const bgColor = yrColors[yearNum] || 'bg-slate-50';
                    
                    return `
                    <div class="border-2 border-slate-100 p-2 h-24 text-center flex flex-col justify-center rounded-2xl relative ${bgColor}">
                        <span class="text-[11px] font-black text-slate-900">${s.roll_no}</span>
                        <span class="text-[6px] truncate font-bold text-slate-400 uppercase mt-1 px-1">${s.name}</span>
                        <div class="mt-1 text-[7px]">
                            <span class="font-black text-indigo-600 uppercase">${s.branch}</span>
                            <span class="text-slate-500 font-bold"> | ${s.year}YR</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;

        // --- ATTENDANCE SHEET HTML ---
        let attendanceHtml = `
        <div class="a4-page italic font-black shadow-2xl">
            <div class="border-[6px] border-double border-slate-900 p-6 text-center mb-6 uppercase">
                <h1 class="text-2xl tracking-tighter">GOKARAJU RANGARAJU INSTITUTE OF ENGINEERING AND TECHNOLOGY</h1>
                <p class="text-[10px] mt-2 tracking-[0.4em]">ATTENDANCE SHEET - ${session} SESSION</p>
            </div>
            <div class="flex justify-between border-2 border-slate-900 p-4 rounded-xl mb-4 uppercase text-[10px] font-black">
                <span>HALL: ${roomData[0].room_number}</span>
                <span>DATE: ${formattedDate}</span>
                <span>STRENGTH: ${students.length}</span>
            </div>
            <table class="w-full border-collapse border-2 border-slate-900 text-[9px]">
                <thead>
                    <tr class="bg-slate-900 text-white uppercase text-center">
                        <th class="border border-slate-900 p-2 w-10">S.No</th>
                        <th class="border border-slate-900 p-2 w-32 text-left">Roll Number</th>
                        <th class="border border-slate-900 p-2 text-left">Student Name</th>
                        <th class="border border-slate-900 p-2 w-32">Signature</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map((s, idx) => `
                    <tr class="border-b border-slate-900">
                        <td class="border border-slate-900 p-1.5 text-center font-bold">${idx + 1}</td>
                        <td class="border border-slate-900 p-1.5 font-black uppercase text-center">${s.roll_no}</td>
                        <td class="border border-slate-900 p-1.5 uppercase truncate text-left">${s.name}</td>
                        <td class="border border-slate-900 p-1.5 h-8"></td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="mt-12 flex justify-between px-10 text-[10px] uppercase font-black">
                <div class="text-center border-t-2 border-slate-900 pt-2 w-48">Invigilator Signature</div>
                <div class="text-center border-t-2 border-slate-900 pt-2 w-48">Chief Superintendent</div>
            </div>
        </div>`;

        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>.a4-page{background:white;width:210mm;min-height:297mm;padding:15mm;margin:40px auto;page-break-after:always;position:relative;}@media print{.no-print{display:none!important;}.a4-page{margin:0;box-shadow:none;width:100%;height:100%;padding:10mm;}}</style></head><body class="bg-slate-900"><div class="no-print p-4 flex justify-center gap-4 sticky top-0 bg-slate-950/90 z-50 backdrop-blur-md border-b border-slate-800"><button onclick="window.close()" class="bg-slate-800 text-white px-6 py-2 rounded-xl text-xs uppercase font-black">Close Window</button><button onclick="window.print()" class="bg-indigo-600 text-white px-12 py-3 rounded-xl text-xs uppercase font-black italic shadow-2xl">Print Document</button></div>${seatingHtml}${attendanceHtml}</body></html>`);

    } catch (err) { res.status(500).send("Reprint Error: " + err.message); }
};

// 4. CLEAR HISTORY ACTION
exports.clearHistory = async (req, res) => {
    try {
        await db.query("DELETE FROM room_allocations");
        res.redirect('/history');
    } catch (err) { res.status(500).send(err.message); }
};

// 5. REGISTRY & MANAGEMENT
exports.getHistory = async (req, res) => {
    try {
        const searchDate = req.query.searchDate || "";
        let q = "SELECT ra.*, r.room_number FROM room_allocations ra JOIN rooms r ON ra.room_id = r.id";
        if (searchDate) q += " WHERE ra.exam_date = '" + searchDate + "'";
        const [records] = await db.query(q + " ORDER BY ra.exam_date DESC, r.room_number ASC");
        res.render('history', { records, searchDate });
    } catch (err) { res.status(500).send(err.message); }
};

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

// Add this to allocationController.js
exports.findStudentRoom = async (req, res) => {
    try {
        const { roll_no, date, session } = req.body;
        
        // 1. Get student details first
        const [studentRows] = await db.execute(
            'SELECT branch, year FROM students WHERE roll_no = ?', 
            [roll_no]
        );

        if (studentRows.length === 0) {
            return res.json({ success: false, message: 'Student not found' });
        }

        const { branch, year } = studentRows[0];

        // 2. FIND THE SPECIFIC ALLOCATION
        // We use ORDER BY id DESC to get the latest allocation if there are duplicates
        const [allocRows] = await db.execute(
            `SELECT rooms.room_number 
             FROM room_allocations 
             JOIN rooms ON room_allocations.room_id = rooms.id 
             WHERE room_allocations.branch = ? 
             AND room_allocations.year = ? 
             AND room_allocations.exam_date = ? 
             AND room_allocations.exam_session = ?
             LIMIT 1`, 
            [branch, year, date, session]
        );

        if (allocRows.length > 0) {
            res.json({ success: true, room: allocRows[0].room_number });
        } else {
            res.json({ success: false, message: 'No allocation found for this student today' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
};

exports.swapRoomAction = async (req, res) => {
    try {
        const { allocation_id, new_room_id } = req.body;
        await db.query("UPDATE room_allocations SET room_id = ? WHERE id = ?", [new_room_id, allocation_id]);
        res.json({ success: true });
    } catch (err) { res.json({ success: false, message: err.message }); }
};

exports.getSwapDetails = async (req, res) => {
    try {
        const { room_number, date, session } = req.body;
        const [roomInfo] = await db.query("SELECT id FROM rooms WHERE room_number = ?", [room_number]);
        if (roomInfo.length === 0) return res.json({ success: false, message: "Invalid Room!" });
        const [alloc] = await db.query(`SELECT ra.id, ra.branch, ra.year FROM room_allocations ra WHERE ra.room_id = ? AND DATE(ra.exam_date) = ? AND ra.exam_session = ?`, [roomInfo[0].id, date, session]);
        if (alloc.length === 0) return res.json({ success: false, message: "No active allocation!" });
        const [available] = await db.query(`SELECT * FROM rooms WHERE id NOT IN (SELECT room_id FROM room_allocations WHERE DATE(exam_date) = ? AND exam_session = ?)`, [date, session]);
        res.json({ success: true, allocation: alloc[0], availableRooms: available });
    } catch (err) { res.json({ success: false, message: err.message }); }
};

// 6. BULK & SINGLE ACTIONS
exports.addStudent = async (req, res) => { await db.query('INSERT INTO students (roll_no, name, year, branch) VALUES (?, ?, ?, ?)', [req.body.roll, req.body.name, req.body.year, req.body.branch]); res.redirect('/manage-students'); };
exports.bulkUploadStudents = async (req, res) => { const v = req.body.csv_data.trim().split('\n').map(l => l.split(',').map(s => s.trim())); if(v.length > 0) await Student.addBulk(v); res.redirect('/manage-students'); };
exports.manageRooms = async (req, res) => { const rooms = await Room.getAll(); res.render('rooms', { rooms }); };
exports.addRoom = async (req, res) => { await db.query('INSERT INTO rooms (room_number, capacity) VALUES (?, ?)', [req.body.r_num, req.body.cap]); res.redirect('/manage-rooms'); };
exports.bulkUploadRooms = async (req, res) => { try { const data = req.body.room_data.trim(); if(!data) return res.redirect('/manage-rooms'); const values = data.split('\n').map(l => l.split(',').map(s => s.trim())); await Room.addBulk(values); res.redirect('/manage-rooms'); } catch (err) { res.status(500).send(err.message); } };
exports.deleteAllocation = async (req, res) => { await db.query("DELETE FROM room_allocations WHERE id = ?", [req.params.id]); res.redirect('/history'); };