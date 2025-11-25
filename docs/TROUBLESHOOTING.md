# Troubleshooting Guide

## Issue: "Failed to load dashboard data"

### Quick Diagnosis

Run these commands to check the setup:

```bash
# 1. Check if database exists and has data
ls -lh backend/database/recruitment.db
# Should show ~1.7MB file size

# 2. Check if backend is running
curl http://localhost:5000/api/health
# Should return: {"status":"ok"}

# 3. Check if frontend is running
curl http://localhost:3000
# Should return HTML
```

---

## Solution Steps

### Step 1: Verify Database

```bash
# Check database file size
ls -lh backend/database/recruitment.db

# If file is 0 bytes or missing, you need to regenerate data
cd backend
python3 scripts/generate_candidates_v2.py
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm run install:all

# Or manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Step 3: Set Up Environment Variables

```bash
# Copy example env file
cd backend
cp .env.example .env

# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=your_key_here
```

### Step 4: Start Backend Server

```bash
cd backend
npm run dev

# Should see:
# Server running on port 5000
```

**Common Backend Issues:**

- **Port 5000 already in use**: Kill the process or change port in `backend/server.js`
- **Missing OpenAI key**: Some features won't work but dashboard should still load
- **Database locked**: Close any SQLite browser tools


### Step 5: Start Frontend Server

```bash
cd frontend
npm run dev

# Should see:
# ready - started server on 0.0.0.0:3000
```

**Common Frontend Issues:**

- **Port 3000 already in use**: Kill the process or change port
- **Module not found**: Run `npm install` again
- **API connection failed**: Check backend is running on port 5000

### Step 6: Test the Connection

1. Open browser: `http://localhost:3000`
2. Login as recruiter:
   - Email: `recruiter@futureworks.com`
   - Password: `recruiter123`
3. Navigate to Dashboard

---

## Specific Error Messages

### "Failed to load dashboard data"

**Cause**: Frontend can't connect to backend API

**Solutions**:
1. Verify backend is running: `curl http://localhost:5000/api/health`
2. Check browser console for actual error (F12 → Console tab)
3. Verify API URL in frontend code (should be `http://localhost:5000`)

### "Database is locked"

**Cause**: Another process is accessing the database

**Solutions**:
1. Close any SQLite browser tools (DB Browser for SQLite, etc.)
2. Restart backend server
3. Check for zombie processes: `lsof | grep recruitment.db`

### "Cannot find module"

**Cause**: Missing dependencies

**Solutions**:
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

# Reinstall
npm run install:all
```


### "CORS Error"

**Cause**: Frontend and backend on different origins

**Solutions**:
1. Verify backend CORS settings allow `http://localhost:3000`
2. Check `backend/server.js` has proper CORS configuration
3. Restart both servers

### "Empty Dashboard / No Data"

**Cause**: Database is empty or not connected

**Solutions**:
```bash
# Check database has data
cd backend
sqlite3 database/recruitment.db "SELECT COUNT(*) FROM candidates;"
# Should return: 931

# If returns 0, regenerate data:
python3 scripts/generate_candidates_v2.py
```

---

## Complete Fresh Setup

If nothing works, start from scratch:

```bash
# 1. Pull latest code
git pull origin main

# 2. Clean everything
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf backend/.next frontend/.next

# 3. Verify database exists
ls -lh backend/database/recruitment.db
# Should be ~1.7MB

# 4. Install dependencies
npm run install:all

# 5. Set up environment
cd backend
cp .env.example .env
# Edit .env and add OpenAI key

# 6. Start backend (in one terminal)
cd backend
npm run dev

# 7. Start frontend (in another terminal)
cd frontend
npm run dev

# 8. Open browser
# http://localhost:3000
```

---

## Still Not Working?

### Check These:

1. **Node.js Version**: Should be v18 or higher
   ```bash
   node --version
   ```

2. **Python Version**: Should be Python 3.8+
   ```bash
   python3 --version
   ```

3. **Git LFS**: If database file is 0 bytes, might be Git LFS issue
   ```bash
   git lfs pull
   ```

4. **File Permissions**: Ensure database is readable
   ```bash
   chmod 644 backend/database/recruitment.db
   ```

5. **Check Logs**: Look at terminal output for actual error messages

---

## Contact

If issue persists, provide:
- Error message from browser console (F12)
- Backend terminal output
- Frontend terminal output
- Output of: `ls -lh backend/database/recruitment.db`

