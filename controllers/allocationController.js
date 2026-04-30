// controllers/allocationController.js
const db = require('../config/db');

// ── Branch color map for print cards
const branchColors = {
    CSE:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    AIML:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    CSDS:  { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8' },
    ECE:   { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
    MECH:  { bg: '#fefce8', border: '#fde68a', text: '#92400e' },
    CIVIL: { bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a' },
};
const defaultColor = { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' };

function buildSeatingPage(room_number, exam_date, exam_session, students) {
    const cards = students.map(s => {
        const c = branchColors[s.branch] || defaultColor;
        return `<div style="background:${c.bg};border:2px solid ${c.border};border-radius:12px;padding:8px 4px;height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
            <div style="font-size:10px;font-weight:900;color:#0f172a;font-style:italic;">${s.roll_no}</div>
            <div style="font-size:6px;color:#64748b;text-transform:uppercase;margin-top:3px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</div>
            <div style="font-size:7px;font-weight:900;color:${c.text};margin-top:4px;text-transform:uppercase;background:${c.border};padding:2px 6px;border-radius:4px;">${s.branch} · ${s.year}Y</div>
        </div>`;
    }).join('');
    return `<div class="a4-page">
        <div style="border:5px double #0f172a;padding:20px;text-align:center;margin-bottom:24px;">
            <div style="font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#64748b;">Gokaraju Rangaraju Institute of Engineering and Technology</div>
            <div style="font-size:9px;letter-spacing:0.2em;margin-top:6px;color:#94a3b8;text-transform:uppercase;">Autonomous | Accredited by NBA & NAAC | Affiliated to JNTUH</div>
        </div>
        <div style="display:flex;justify-content:space-between;background:#0f172a;color:#fff;padding:14px 20px;border-radius:14px;margin-bottom:24px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;font-style:italic;">
            <span>Hall: ${room_number}</span><span>${exam_date}</span>
            <span>${exam_session === 'FN' ? 'Forenoon' : 'Afternoon'}</span><span>${students.length} Students</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">${cards}</div>
    </div>`;
}

function buildAttendancePage(room_number, exam_date, exam_session, students) {
    const rows = students.map((s, idx) => {
        const c = branchColors[s.branch] || defaultColor;
        return `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 10px;text-align:center;font-size:10px;color:#475569;">${idx + 1}</td>
            <td style="padding:8px 10px;font-weight:900;font-size:10px;text-transform:uppercase;color:#0f172a;font-style:italic;">${s.roll_no}</td>
            <td style="padding:8px 10px;font-size:10px;text-transform:uppercase;color:#334155;">${s.name}</td>
            <td style="padding:8px 10px;font-size:9px;font-weight:900;color:${c.text};">${s.branch}</td>
            <td style="padding:8px 10px;height:32px;"></td>
        </tr>`;
    }).join('');
    return `<div class="a4-page">
        <div style="border:5px double #0f172a;padding:20px;text-align:center;margin-bottom:20px;">
            <div style="font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#64748b;">Gokaraju Rangaraju Institute of Engineering and Technology</div>
            <div style="font-size:16px;font-weight:900;margin-top:8px;text-transform:uppercase;font-style:italic;">Attendance Sheet — Hall ${room_number}</div>
        </div>
        <div style="display:flex;justify-content:space-between;background:#0f172a;color:#fff;padding:12px 20px;border-radius:12px;margin-bottom:20px;font-size:10px;font-weight:900;text-transform:uppercase;font-style:italic;">
            <span>Hall: ${room_number}</span><span>${exam_date}</span><span>${exam_session === 'FN' ? 'Forenoon' : 'Afternoon'}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:2px solid #0f172a;">
            <thead><tr style="background:#0f172a;color:#fff;">
                <th style="padding:10px;font-size:9px;text-transform:uppercase;width:50px;">S.No</th>
                <th style="padding:10px;font-size:9px;text-transform:uppercase;text-align:left;">Roll No</th>
                <th style="padding:10px;font-size:9px;text-transform:uppercase;text-align:left;">Name</th>
                <th style="padding:10px;font-size:9px;text-transform:uppercase;width:60px;">Dept</th>
                <th style="padding:10px;font-size:9px;text-transform:uppercase;width:100px;">Signature</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

function buildPrintShell(pagesHtml, backUrl = '/') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>GRIET EMS</title>
    <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0f172a;font-family:sans-serif;}
        .a4-page{background:white;width:210mm;min-height:297mm;padding:14mm;margin:32px auto;page-break-after:always;box-shadow:0 20px 60px rgba(0,0,0,0.5);}
        .no-print{position:sticky;top:0;z-index:100;background:#020617;border-bottom:1px solid #1e293b;padding:12px 24px;display:flex;align-items:center;justify-content:center;gap:12px;}
        .np-btn{padding:8px 24px;border-radius:10px;font-size:11px;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;border:none;text-decoration:none;}
        @media print{.no-print{display:none!important;}.a4-page{margin:0;box-shadow:none;width:100%;padding:10mm;}body{background:white;}}
    </style></head><body>
    <div class="no-print">
        <span style="color:#64748b;font-size:10px;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:0.2em;">GRIET EMS — Seating Plan</span>
        <a href="${backUrl}" class="np-btn" style="background:#1e293b;color:#94a3b8;">← Back</a>
        <button onclick="window.print()" class="np-btn" style="background:#6366f1;color:#fff;">🖨 Print All</button>
    </div>
    ${pagesHtml}</body></html>`;
}

// ═══════════════════════════════════════════
// GENERATE PLAN
// ═══════════════════════════════════════════
exports.generatePlan = async (req, res) => {
    try {
        const { exam_date, exam_session, selected_year, selected_branches, selected_rooms, alternate_mode, jumble_mode } = req.body;
        const brIds = Array.isArray(selected_branches) ? selected_branches : [selected_branches];
        const rmIds = Array.isArray(selected_rooms) ? selected_rooms : [selected_rooms];

        // Fetch all students sorted by branch then roll_no
        const [allStudents] = await db.query(
            'SELECT roll_no, name, year, branch FROM students WHERE year = ? AND branch IN (?) ORDER BY branch, roll_no ASC',
            [selected_year, brIds]
        );

        let studentsToPlace = [];

        if (alternate_mode === 'true' && brIds.length > 1) {
            // ── ALTERNATE: CSE[0]→AIML[0]→CSE[1]→AIML[1]→...
            // Build one queue per branch in the order they were selected
            const groups = {};
            brIds.forEach(br => { groups[br] = allStudents.filter(s => s.branch === br); });
            const maxLen = Math.max(...Object.values(groups).map(g => g.length));
            for (let i = 0; i < maxLen; i++) {
                brIds.forEach(br => { if (groups[br] && groups[br][i]) studentsToPlace.push(groups[br][i]); });
            }

        } else if (jumble_mode === 'true') {
            // ── JUMBLED: true random shuffle (Fisher-Yates)
            studentsToPlace = [...allStudents];
            for (let i = studentsToPlace.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [studentsToPlace[i], studentsToPlace[j]] = [studentsToPlace[j], studentsToPlace[i]];
            }

        } else {
            // ── NORMAL: branch by branch in roll_no order
            studentsToPlace = allStudents;
        }

        const [rooms] = await db.query(
            'SELECT * FROM rooms WHERE id IN (?) ORDER BY room_number ASC', [rmIds]
        );
        const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);

        if (studentsToPlace.length > totalCapacity) {
            return res.send(buildPrintShell(`
                <div class="a4-page" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;">
                    <div style="font-size:48px;">⚠️</div>
                    <h2 style="color:#ef4444;font-size:24px;font-weight:900;">Insufficient Capacity</h2>
                    <p style="color:#64748b;">Students: <strong>${studentsToPlace.length}</strong> | Seats: <strong>${totalCapacity}</strong></p>
                </div>`, '/'));
        }

        const bookings = [];
        let sIdx = 0;
        let allPages = '';

        for (const room of rooms) {
            if (sIdx >= studentsToPlace.length) break;
            const rStudents = studentsToPlace.slice(sIdx, sIdx + room.capacity);
            if (rStudents.length > 0) {
                bookings.push([room.id, exam_date, exam_session, brIds.join(', '), selected_year, rStudents[0].roll_no]);
                allPages += buildSeatingPage(room.room_number, exam_date, exam_session, rStudents);
                allPages += buildAttendancePage(room.room_number, exam_date, exam_session, rStudents);
            }
            sIdx += room.capacity;
        }

        if (bookings.length > 0) {
            await db.query(
                'INSERT INTO room_allocations (room_id, exam_date, exam_session, branch, year, start_roll_no) VALUES ?',
                [bookings]
            );
        }
        res.send(buildPrintShell(allPages, '/'));
    } catch (err) {
        console.error('Generate Plan Error:', err);
        res.status(500).send('Generation Failed: ' + err.message);
    }
};

// ═══════════════════════════════════════════
// REPRINT
// ═══════════════════════════════════════════
exports.reprintPaper = async (req, res) => {
    try {
        const { room_id, date, session } = req.body;
        const formattedDate = new Date(date).toISOString().split('T')[0];
        const [alloc] = await db.query(
            `SELECT ra.*, r.room_number, r.capacity FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id WHERE ra.room_id = ? AND ra.exam_date = ? AND ra.exam_session = ?`,
            [room_id, formattedDate, session]
        );
        if (!alloc || alloc.length === 0) return res.status(404).send('Allocation not found.');
        const { start_roll_no, capacity, room_number, branch, year } = alloc[0];
        const branches = branch.split(',').map(b => b.trim());
        const [allStudents] = await db.query(
            'SELECT roll_no, name, year, branch FROM students WHERE branch IN (?) AND year = ? ORDER BY branch, roll_no ASC',
            [branches, year]
        );
        const startIdx = allStudents.findIndex(s => s.roll_no.toUpperCase() === start_roll_no.toUpperCase());
        const students = startIdx >= 0 ? allStudents.slice(startIdx, startIdx + capacity) : allStudents.slice(0, capacity);
        const pages = buildSeatingPage(room_number, formattedDate, session, students)
                    + buildAttendancePage(room_number, formattedDate, session, students);
        res.send(buildPrintShell(pages, '/history'));
    } catch (err) {
        console.error('Reprint Error:', err);
        res.status(500).send('Reprint Error: ' + err.message);
    }
};

// ═══════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════
exports.getHistory = async (req, res) => {
    try {
        const searchDate = req.query.searchDate || '';
        let q = 'SELECT ra.*, r.room_number FROM room_allocations ra JOIN rooms r ON ra.room_id = r.id';
        const params = [];
        if (searchDate) { q += ' WHERE ra.exam_date = ?'; params.push(searchDate); }
        q += ' ORDER BY ra.exam_date DESC, r.room_number ASC';
        const [records] = await db.query(q, params);
        res.render('history', { records, searchDate });
    } catch (err) { res.status(500).send('Error loading history.'); }
};

exports.clearHistory = async (req, res) => {
    try { await db.query('DELETE FROM room_allocations'); res.redirect('/history'); }
    catch (err) { res.status(500).send(err.message); }
};

exports.deleteAllocation = async (req, res) => {
    try { await db.query('DELETE FROM room_allocations WHERE id = ?', [req.params.id]); res.redirect('/history'); }
    catch (err) { res.status(500).send(err.message); }
};

// ═══════════════════════════════════════════
// STUDENT FINDER
// ═══════════════════════════════════════════
exports.findStudentRoom = async (req, res) => {
    try {
        const { roll_no, date, session } = req.body;
        const cleanRoll = roll_no.trim().toUpperCase();
        const [student] = await db.execute('SELECT branch, year FROM students WHERE UPPER(roll_no) = ?', [cleanRoll]);
        if (student.length === 0) return res.json({ success: false, message: 'Student not found in registry.' });
        const { branch, year } = student[0];
        const [halls] = await db.execute(
            `SELECT r.room_number, r.capacity, ra.start_roll_no, ra.id FROM room_allocations ra
             JOIN rooms r ON ra.room_id = r.id
             WHERE ra.exam_date = ? AND ra.exam_session = ? AND ra.branch LIKE ? AND ra.year = ? ORDER BY ra.id ASC`,
            [date, session, `%${branch}%`, year]
        );
        if (halls.length === 0) return res.json({ success: false, message: 'No allocation found for this date/session.' });
        const [allStudents] = await db.execute(
            'SELECT roll_no FROM students WHERE branch = ? AND year = ? ORDER BY branch, roll_no ASC', [branch, year]
        );
        const allRolls = allStudents.map(s => s.roll_no.toUpperCase());
        const studentIndex = allRolls.indexOf(cleanRoll);
        if (studentIndex === -1) return res.json({ success: false, message: 'Roll number mismatch. Contact admin.' });
        let offset = 0, assignedRoom = null;
        for (const hall of halls) {
            const startIdx = allRolls.indexOf(hall.start_roll_no.toUpperCase());
            if (offset === 0 && startIdx !== -1) offset = startIdx;
            const hallEnd = offset + hall.capacity - 1;
            if (studentIndex >= offset && studentIndex <= hallEnd) { assignedRoom = hall.room_number; break; }
            offset = hallEnd + 1;
        }
        assignedRoom ? res.json({ success: true, room: assignedRoom })
                     : res.json({ success: false, message: 'Student not allocated for this session.' });
    } catch (err) {
        console.error('Finder Error:', err);
        res.status(500).json({ success: false, message: 'Database error.' });
    }
};

// ═══════════════════════════════════════════
// SWAP
// ═══════════════════════════════════════════
exports.getSwapDetails = async (req, res) => {
    try {
        const { room_number, date, session } = req.body;
        const [room] = await db.query('SELECT id FROM rooms WHERE room_number = ?', [room_number]);
        if (room.length === 0) return res.json({ success: false, message: 'Invalid Room!' });
        const [alloc] = await db.query(
            'SELECT id, branch, year FROM room_allocations WHERE room_id = ? AND DATE(exam_date) = ? AND exam_session = ?',
            [room[0].id, date, session]
        );
        if (alloc.length === 0) return res.json({ success: false, message: 'No allocation found!' });
        const [avail] = await db.query(
            'SELECT * FROM rooms WHERE id NOT IN (SELECT room_id FROM room_allocations WHERE DATE(exam_date) = ? AND exam_session = ?)',
            [date, session]
        );
        res.json({ success: true, allocation: alloc[0], availableRooms: avail });
    } catch (err) { res.json({ success: false, message: err.message }); }
};

exports.swapRoomAction = async (req, res) => {
    try {
        await db.query('UPDATE room_allocations SET room_id = ? WHERE id = ?', [req.body.new_room_id, req.body.allocation_id]);
        res.json({ success: true });
    } catch (err) { res.json({ success: false, message: err.message }); }
};