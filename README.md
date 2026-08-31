# 🎓 GRIET EMS — Exam Management System

> A web-based exam seating arrangement system built for **Gokaraju Rangaraju Institute of Engineering and Technology (GRIET)**. Handles student registry, room management, automated seat allocation, and printable seating plans — all from a single admin dashboard.

---

## ✨ Features

- 🔐 **Admin Authentication** — session-based login with environment variable credentials
- 👨‍🎓 **Student Registry** — add students individually or bulk upload via CSV
- 🏫 **Room Management** — manage exam halls and their capacities
- 🪑 **Seat Allocation** with three modes:
  - **Normal** — sequential by branch + roll number
  - **Alternate Seating** — interleaves departments (Dept-A / Dept-B / Dept-A…)
  - **Jumbled Mode** — Fisher-Yates random shuffle across all roll numbers
- 🖨️ **Printable Output** — A4 seating plan cards + attendance sheets, print-ready
- 🔍 **Student Room Finder** — students can look up their assigned hall by roll number
- 🔁 **Room Swap** — swap allocations between halls after generation
- 📜 **History** — view, reprint, or delete past allocations
- 🌗 **Dark / Light Mode** — full theme support via CSS variables

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| View Engine | EJS |
| Database | TiDB (MySQL-compatible, cloud) |
| ORM / Query | mysql2 (promise pool) |
| Auth | express-session |
| Hosting | Render |

---

## 📁 Project Structure

```
exam_project/
├── config/
│   └── db.js                  # MySQL2 pool — reads from env vars
├── controllers/
│   ├── authController.js      # Login / logout
│   ├── dashboardController.js # Dashboard stats + room overview
│   ├── studentController.js   # Student CRUD, bulk upload, room finder
│   ├── roomController.js      # Room CRUD, bulk upload
│   └── allocationController.js# Core seating logic + print + swap
├── middleware/
│   └── auth.js                # isLoggedIn session guard
├── models/
│   ├── roomModel.js           # Room DB operations
│   └── studentModel.js        # Student DB operations
├── routes/
│   └── adminRoutes.js         # All routes (public + protected)
├── views/
│   ├── partials/
│   │   └── header.ejs
│   ├── dashboard.ejs
│   ├── login.ejs
│   ├── registry.ejs
│   ├── rooms.ejs
│   └── history.ejs
├── public/                    # Static assets (CSS, JS, images)
├── server.js                  # Entry point
└── package.json
```

---

## ⚙️ Environment Variables

Set these in your **Render** dashboard (or a `.env` file locally):

| Variable | Description |
|---|---|
| `DB_HOST` | TiDB / MySQL host |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_PORT` | Database port (default: `3306`) |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `SESSION_SECRET` | Secret key for session signing |
| `NODE_ENV` | Set to `production` on Render |

---

## 🗄️ Database Schema

```sql
CREATE TABLE students (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    roll_no  VARCHAR(20) UNIQUE NOT NULL,
    name     VARCHAR(100) NOT NULL,
    year     INT NOT NULL,
    branch   VARCHAR(20) NOT NULL
);

CREATE TABLE rooms (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    room_number  VARCHAR(20) UNIQUE NOT NULL,
    capacity     INT NOT NULL
);

CREATE TABLE room_allocations (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    room_id      INT NOT NULL,
    exam_date    DATE NOT NULL,
    exam_session VARCHAR(5) NOT NULL,   -- 'FN' or 'AN'
    branch       VARCHAR(100) NOT NULL,
    year         INT NOT NULL,
    start_roll_no VARCHAR(20) NOT NULL,
    jumble_mode  TINYINT DEFAULT 0,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);
```

---

## 🚀 Getting Started (Local)

```bash
# 1. Clone the repo
git clone [https://github.com/YOUR_USER_ID/exam_project]
cd griet-ems

# 2. Install dependencies
npm install

# 3. Create a .env file with your DB + admin credentials (see above)

# 4. Run in development
npm run dev

# 5. Open in browser
# http://localhost:3000
```

> **Note:** Requires Node.js 18+ and a running MySQL / TiDB instance.

---

## 🌐 Deployment (Render)

1. Push your code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `npm start`
5. Add all environment variables from the table above
6. Deploy — Render auto-deploys on every push to `main`

---

## 📋 API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/login` | Login page |
| POST | `/login` | Authenticate admin |
| GET | `/logout` | Destroy session |
| GET | `/` | Dashboard |
| POST | `/generate` | Generate seating allocation |
| GET | `/manage-students` | Student registry |
| POST | `/add-student-single` | Add one student |
| POST | `/bulk-upload` | Bulk upload students (CSV) |
| POST | `/find-student-room` | Student hall lookup |
| GET | `/manage-rooms` | Room management |
| POST | `/add-room-single` | Add one room |
| POST | `/bulk-rooms` | Bulk upload rooms |
| GET | `/history` | Allocation history |
| POST | `/reprint-paper` | Reprint seating plan |
| GET | `/delete-allocation/:id` | Delete one allocation |
| GET | `/clear-history` | Clear all allocations |
| POST | `/get-swap-details` | Fetch swap candidates |
| POST | `/swap-room` | Execute room swap |

---

## 📦 Bulk Upload Format

**Students CSV** (one per line):
```
ROLL_NO, NAME, YEAR, BRANCH
24241A0501, Ravi Kumar, 2, CSE
24241A0502, Priya Sharma, 2, AIML
```

**Rooms CSV** (one per line):
```
ROOM_NUMBER, CAPACITY
101, 40
102, 35
```

---

## 🧑‍💻 Author

Built by a student of **GRIET, Hyderabad** — Roll No. `24241A0555`

---

## 📄 License

ISC
