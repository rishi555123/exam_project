// controllers/allocationController.js
const db = require('../config/db');

const yrColors = { 1: 'bg-blue-50', 2: 'bg-emerald-50', 3: 'bg-amber-50', 4: 'bg-violet-50' };

// ─── GENERATE PLAN ────────────────────────────────────────────────────────────
exports.generatePlan = async (req, res) => {
    try {
        const { exam_date, exam_session, selected_year, selected_branches, selected_rooms, jumble_mode } = req.body;
        const brIds = Array.isArray(selected_branches) ? selected_branches : [selected_branches];
        const rmIds = Array.isArray(selected_rooms) ? selected_rooms : [selected_rooms];

        const [allStudents] = await db.query(
            'SELECT roll_no, name, year, branch FROM students WHERE year = ? AND branch IN (?) ORDER BY branch, roll_no ASC',
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

        const [rooms] = await db.query('SELECT * FROM rooms WHERE id IN (?) ORDER BY room_number ASC', [rmIds]);
        const totalAvailableCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);

        if (studentsToPlace.length > totalAvailableCapacity) {
            return res.send(`<div style="background:#0f172a;color:white;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;"><div><h2 style="color:#ef4444;">INSUFFICIENT CAPACITY</h2><p>Students: ${studentsToPlace.length} | Capacity: ${totalAvailableCapacity}</p><a href="/" style="color:white;text-decoration:underline;">Go Back</a></div></div>`);
        }

        const bookings = [];
        let sIdx = 0;
        let pagesHtml = '';
        let attendanceHtml = '';

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
    } catch (err) {
        console.error('Generate Plan Error:', err);
        res.status(500).send('Generation Failed: ' + err.message);
    }
};

// ─── REPRINT ──────────────────────────────────────────────────────────────────
exports.reprintPaper = async (req, res) => {
    try {
        const { room_id, date, session } = req.body;
        const formattedDate = new Date(date).toISOString().split('T')[0];

        const [alloc] = await db.query(
            `SELECT ra.*, r.room_number, r.capacity FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id
             WHERE ra.room_id = ? AND ra.exam_date = ? AND ra.exam_session = ?`,
            [room_id, formattedDate, session]
        );

        if (!alloc || alloc.length === 0) return res.status(404).send('Allocation not found.');

        const { branch, year, capacity, room_number } = alloc[0];

        const [prev] = await db.query(
            `SELECT COUNT(*) as count FROM room_allocations
             WHERE branch = ? AND year = ? AND exam_date = ? AND exam_session = ? AND room_id < ?`,
            [branch, year, formattedDate, session, room_id]
        );

        const skip = prev[0].count * capacity;
        const [students] = await db.query(
            `SELECT roll_no, name, year, branch FROM students
             WHERE branch = ? AND year = ?
             ORDER BY roll_no ASC LIMIT ? OFFSET ?`,
            [branch, year, capacity, skip]
        );

        const seatingHtml = `<div class="a4-page italic font-black"><div class="border-[6px] border-double border-slate-900 p-6 text-center mb-8 uppercase"><h1 class="text-2xl tracking-tighter">Gokaraju Rangaraju Institute of Engineering and Technology</h1><p class="text-[10px] mt-2 tracking-[0.4em]">DATE: ${formattedDate}</p></div><div class="flex justify-between bg-slate-950 text-white p-5 rounded-2xl mb-10 text-xs"><span>HALL: ${room_number}</span><span>SESSION: ${session}</span><span>COUNT: ${students.length}</span></div><div class="grid grid-cols-6 gap-3">${students.map(s => `<div class="border-2 border-slate-100 p-2 h-24 text-center flex flex-col justify-center rounded-2xl ${yrColors[s.year] || 'bg-slate-50'}"><span class="text-[11px] font-black">${s.roll_no}</span><span class="text-[6px] truncate text-slate-400 uppercase">${s.name}</span><div class="text-[7px] text-indigo-600 uppercase">${s.branch} | ${s.year}YR</div></div>`).join('')}</div></div>`;

        const attendanceHtml = `<div class="a4-page italic font-black"><div class="border-[6px] border-double border-slate-900 p-6 text-center mb-6 uppercase"><h1 class="text-2xl tracking-tighter">Gokaraju Rangaraju Institute of Engineering and Technology</h1><p class="text-[10px] mt-2 tracking-[0.4em]">ATTENDANCE - ${session}</p></div><table class="w-full border-collapse border-2 border-slate-900 text-[9px]"><thead><tr class="bg-slate-900 text-white uppercase text-center"><th class="border p-2">S.No</th><th class="border p-2">Roll</th><th class="border p-2">Name</th><th class="border p-2">Sign</th></tr></thead><tbody>${students.map((s, idx) => `<tr class="border-b border-slate-900"><td class="border p-1.5 text-center">${idx + 1}</td><td class="border p-1.5 font-black text-center">${s.roll_no}</td><td class="border p-1.5 uppercase">${s.name}</td><td class="border p-1.5 h-8"></td></tr>`).join('')}</tbody></table></div>`;

        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><style>.a4-page{background:white;width:210mm;min-height:297mm;padding:15mm;margin:40px auto;page-break-after:always;}@media print{.no-print{display:none!important;}.a4-page{margin:0;}}</style></head><body class="bg-slate-900"><div class="no-print p-4 flex justify-center gap-4 sticky top-0 bg-slate-950 z-50"><button onclick="window.print()" class="bg-indigo-600 text-white px-12 py-3 rounded-xl font-black italic shadow-2xl">Print Document</button></div>${seatingHtml}${attendanceHtml}</body></html>`);
    } catch (err) {
        console.error('Reprint Error:', err);
        res.status(500).send('Reprint Error: ' + err.message);
    }
};

// ─── HISTORY ──────────────────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
    try {
        const searchDate = req.query.searchDate || '';
        // FIXED: was raw string concat before — now parameterized
        let q = 'SELECT ra.*, r.room_number FROM room_allocations ra JOIN rooms r ON ra.room_id = r.id';
        const params = [];
        if (searchDate) { q += ' WHERE ra.exam_date = ?'; params.push(searchDate); }
        q += ' ORDER BY ra.exam_date DESC, r.room_number ASC';

        const [records] = await db.query(q, params);
        res.render('history', { records, searchDate });
    } catch (err) {
        console.error('History Error:', err);
        res.status(500).send('Error loading history.');
    }
};

exports.clearHistory = async (req, res) => {
    try {
        await db.query('DELETE FROM room_allocations');
        res.redirect('/history');
    } catch (err) {
        console.error('Clear History Error:', err);
        res.status(500).send(err.message);
    }
};

exports.deleteAllocation = async (req, res) => {
    try {
        await db.query('DELETE FROM room_allocations WHERE id = ?', [req.params.id]);
        res.redirect('/history');
    } catch (err) {
        console.error('Delete Allocation Error:', err);
        res.status(500).send(err.message);
    }
};

// ─── SWAP ─────────────────────────────────────────────────────────────────────
exports.getSwapDetails = async (req, res) => {
    try {
        const { room_number, date, session } = req.body;
        const [room] = await db.query('SELECT id FROM rooms WHERE room_number = ?', [room_number]);
        if (room.length === 0) return res.json({ success: false, message: 'Invalid Room!' });

        const [alloc] = await db.query(
            'SELECT id, branch, year FROM room_allocations WHERE room_id = ? AND DATE(exam_date) = ? AND exam_session = ?',
            [room[0].id, date, session]
        );
        if (alloc.length === 0) return res.json({ success: false, message: 'No allocation!' });

        const [avail] = await db.query(
            'SELECT * FROM rooms WHERE id NOT IN (SELECT room_id FROM room_allocations WHERE DATE(exam_date) = ? AND exam_session = ?)',
            [date, session]
        );
        res.json({ success: true, allocation: alloc[0], availableRooms: avail });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.swapRoomAction = async (req, res) => {
    try {
        await db.query('UPDATE room_allocations SET room_id = ? WHERE id = ?', [req.body.new_room_id, req.body.allocation_id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};