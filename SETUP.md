# Setup Guide for New Users

## Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd sampleproject
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Configure Environment Variables ⚠️ REQUIRED

**IMPORTANT:** The `.env` file is required for the application to work!

Create `backend/.env` file:
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set a JWT secret:
```env
PORT=5001
JWT_SECRET=change_this_to_any_random_string_at_least_32_characters
APP_URL=http://localhost:3000

# Optional: AI Provider (works without this)
AI_PROVIDER=mock
```

**Note:** 
- The `JWT_SECRET` is REQUIRED for user authentication
- Change it to any random string (recommended: 32+ characters)
- Without this file, registration and login will fail
- This project uses SQLite (file-based database), NOT MongoDB

### 4. Verify Database

The repository includes a pre-populated database with 931 candidates.

**Check database exists:**
```bash
ls -lh backend/database/recruitment.db
# Should show ~1.7MB file size
```

**If database is missing or empty (0 bytes):**
```bash
cd backend
python3 scripts/generate_candidates_v2.py
```

This will create:
- 931 candidates with realistic profiles
- 1,925 applications across 20 cybersecurity roles
- AI analysis results
- Test scores and skill verification
- Complete SQLite database

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```
Backend runs on: http://localhost:5001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:3000

### 6. Login

**Default Recruiter Account:**
- Email: `recruiter@example.com`
- Password: `password123`

---

## Troubleshooting

### Registration/Login Fails - "Cannot connect to database"

**This error message is misleading!** The project uses SQLite (not MongoDB).

**Real cause:** Missing `.env` file

**Solution:**
```bash
cd backend
cp .env.example .env
# Edit .env and set JWT_SECRET to any random string
node server.js
```

### "Failed to load dashboard data"

**Cause:** Backend server not running or database empty

**Solution:**
```bash
# 1. Check database has data
ls -lh backend/database/recruitment.db
# Should be ~1.7MB, not 0 bytes

# 2. If empty, regenerate data
cd backend
python3 scripts/generate_candidates_v2.py

# 3. Start backend server
npm run dev

# 4. Test API
curl http://localhost:5000/api/health
```

### Database Connection Error

If you see "database connection error" or "table does not exist":

```bash
# Regenerate database with data
cd backend
python3 scripts/generate_candidates_v2.py

# Restart backend
npm run dev
```

### Port Already in Use

If port 5001 or 3000 is busy:

**Backend:** Change `PORT` in `backend/.env`
**Frontend:** Change port in `frontend/package.json` dev script

### Missing Dependencies

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Project Structure

```
sampleproject/
├── backend/          # Node.js + Express API
├── frontend/         # Next.js React app
├── README.md         # Full documentation
└── SETUP.md          # This file
```

For detailed documentation, see [README.md](README.md)
