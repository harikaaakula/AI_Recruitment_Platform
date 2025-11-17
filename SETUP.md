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

### 3. Configure Environment Variables

Create `backend/.env` file:
```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5001
JWT_SECRET=your_secret_key_here_change_this
APP_URL=http://localhost:3000

# Optional: AI Provider (works without this)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_api_key_here
MODEL_NAME=deepseek/deepseek-chat-v3.1:free
```

### 4. Generate Sample Data

**Option A: Use Python Script (Recommended)**
```bash
# Install Python dependencies
pip install faker numpy

# Run generation script
python scripts/generate_candidates.py
```

This will create:
- 1,086 candidates
- Applications across 20 job roles
- Test results and AI analysis
- SQLite database with all data

**Option B: Start with Empty Database**
```bash
# Just start the backend - it will create empty tables
node server.js
```

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

### Database Connection Error

If you see "database connection error" or "table does not exist":

```bash
# Delete the database file
rm backend/database/recruitment.db

# Restart backend (will recreate tables)
cd backend
node server.js
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
