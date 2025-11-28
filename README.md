# AI-Powered Recruitment Platform

An intelligent recruitment system that uses AI to analyze resumes, score candidates, verify skills through automated tests, and provide actionable insights to recruiters.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [How It Works](#how-it-works)
- [Testing the System](#testing-the-system)
- [Troubleshooting](#troubleshooting)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Contributors](#contributors)

---

## Overview

The AI-Powered Recruitment Platform streamlines the hiring process by automatically parsing resumes, scoring candidates using AI-based matching against job requirements, administering skill tests to verify competencies, and providing comprehensive analytics to recruiters.

The platform features:
- AI-powered resume parsing and analysis
- Semantic matching (understands "Splunk" = "SIEM", not just keyword matching)
- Automated skill verification through technical assessments
- Weighted composite scoring based on experience level
- Real-time recruiter dashboard with insights
- Job-specific candidate views
- Detailed candidate profiles with skill verification

---

## Features

### For Recruiters

**Dashboard Analytics:**
- Overview metrics (total jobs, candidates, eligibility rates)
- Application status distribution
- AI score distribution
- Job performance analytics
- Skill insights (in-demand skills, common gaps)
- Top candidates ranking with weighted scores
- Recent applications tracking

**Job Management:**
- 20 pre-configured cybersecurity job roles
- Job-specific candidate views
- Quality distribution analysis
- Skill gap identification
- Top candidate recommendations per job

**Candidate Evaluation:**
- Detailed candidate profiles
- Skills analysis (matched vs gaps)
- Experience and education verification
- Test performance metrics
- Skill verification results
- AI-generated strengths and recommendations

### For Candidates

**Application Process:**
- Simple resume upload (PDF)
- Automatic information extraction
- Instant AI-based screening
- Skill-specific technical assessments
- Real-time feedback and suggestions

---

## Technology Stack

### Frontend
- React.js with Next.js framework
- Tailwind CSS for styling
- Context API for state management
- Axios for API communication

### Backend
- Node.js with Express.js
- SQLite database
- JWT authentication
- Multer for file uploads
- pdf-parse for resume extraction

### AI/ML
- OpenRouter API with DeepSeek (free tier)
- Semantic matching engine
- Pattern-based fallback extraction
- Custom scoring algorithms
- Temperature 0 for consistent results

### Data
- 931 pre-generated candidates
- 1,331 applications across 20 job roles
- Realistic skill distributions
- CSV exports for reference

---

## System Architecture

For detailed system architecture and data flow visualization, see `docs/architecture-diagram.png`

### Data Flow

```
1. Candidate Application:
   Resume Upload → PDF Text Extraction → AI Analysis → Score Calculation → 
   Database Storage → Eligibility Determination

2. Skill Testing (if eligible):
   Test Generation → Question Selection → Candidate Answers → 
   Scoring → Skill Verification → Composite Score Calculation

3. Recruiter View:
   Database Query → Data Aggregation → Analytics Calculation → 
   Dashboard Display → Real-time Updates
```

### Scoring System

**AI Resume Score (0-100%):**
- Skills Match: 40% weight
- Knowledge Match: 25% weight
- Tasks Match: 25% weight
- Certifications: 5% weight
- Education: 5% weight

**Composite Score (weighted by experience level):**
- Entry Level: 70% Resume + 30% Test
- Mid Level: 40% Resume + 60% Test
- Senior Level: 30% Resume + 70% Test

**Rationale:** Senior roles prioritize practical skills (test), entry roles prioritize potential (resume)

---

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.x (optional, only for data regeneration)
- OpenRouter API key (optional, for AI features)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sampleproject
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Install Root Dependencies (for concurrent running)

```bash
cd ..
npm install
```

---

## Configuration

### Environment Variables

Create `backend/.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server Configuration
PORT=5001
JWT_SECRET=your_secret_key_here_change_in_production

# Frontend URL
APP_URL=http://localhost:3000

# AI Configuration (Optional - works without API key using fallback)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
MODEL_NAME=deepseek/deepseek-chat:free

# Alternative: Use OpenAI
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here
```

### AI Provider Setup (Optional)

The system works without an API key using pattern-based extraction. For better accuracy:

**Option 1: OpenRouter (Recommended - Free Tier Available)**
1. Visit https://openrouter.ai/keys
2. Create account and generate API key
3. Set `AI_PROVIDER=openrouter` and add key to `.env`
4. Free models available: `deepseek/deepseek-chat:free`

**Option 2: OpenAI**
1. Visit https://platform.openai.com/api-keys
2. Generate API key
3. Set `AI_PROVIDER=openai` and add key to `.env`

**Option 3: Mock Mode (No API Key)**
- Leave `AI_PROVIDER` unset or set to `mock`
- System uses regex-based extraction
- Works well for testing and development

---

## Running the Application

### Method 1: Run Both Servers Concurrently (Recommended)

From project root:

```bash
npm start
```

This starts both backend (port 5001) and frontend (port 3000) simultaneously.

### Method 2: Run Servers Separately

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access the Application

1. Open browser to http://localhost:3000
2. Click "Login"
3. Use default recruiter credentials:
   - Email: `recruiter@example.com`
   - Password: `password123`

---

## Project Structure

```
sampleproject/
├── backend/
│   ├── config/
│   │   └── security.js              # Security configurations
│   ├── data/
│   │   ├── csv/                     # Database exports (reference)
│   │   │   ├── 1_candidates.csv
│   │   │   ├── 2_job_roles.csv
│   │   │   ├── 3_applications.csv
│   │   │   ├── 4_ai_analysis.csv
│   │   │   ├── 5_tests.csv
│   │   │   ├── 6_decisions.csv
│   │   │   ├── 7_test_questions.csv
│   │   │   ├── 8_job_roles_detailed.csv
│   │   │   └── ERD_DOCUMENTATION.md
│   │   ├── jobRoles.js              # 20 job definitions
│   │   ├── testQuestions.js         # Test question bank
│   │   ├── testQuestions_batch1.js
│   │   └── testQuestions_batch2.js
│   ├── database/
│   │   ├── init.js                  # Database initialization
│   │   └── recruitment.db           # SQLite database (1,331 applications)
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication
│   ├── routes/
│   │   ├── analytics.js             # Analytics endpoints
│   │   ├── applications_redesigned.js
│   │   ├── auth.js                  # Login/register
│   │   ├── jobs_redesigned.js
│   │   └── tests.js                 # Test endpoints
│   ├── scripts/
│   │   ├── add_multiple_applications.py
│   │   ├── backup_database.py
│   │   └── generate_candidates_v2.py
│   ├── services/
│   │   ├── aiService.js             # AI parsing & scoring
│   │   ├── improvementSuggestions.js
│   │   └── matchingEngine.js        # Score calculation
│   ├── uploads/                     # Resume storage
│   ├── utils/
│   │   └── pdfParser.js             # PDF extraction
│   ├── .env.example                 # Environment template
│   ├── package.json
│   └── server.js                    # Express server
│
├── frontend/
│   ├── components/
│   │   ├── DashboardFilters.js
│   │   ├── JobCandidateFilters.js
│   │   ├── Layout.js
│   │   ├── PredictiveInsights.js
│   │   └── ScoringExplanation.js
│   ├── context/
│   │   └── AuthContext.js
│   ├── pages/
│   │   ├── recruiter/
│   │   │   ├── applications/
│   │   │   │   └── [id].js          # Candidate profile
│   │   │   ├── jobs/
│   │   │   │   └── [jobId]/
│   │   │   │       └── candidates.js
│   │   │   └── dashboard.js         # Main dashboard
│   │   ├── _app.js
│   │   ├── index.js                 # Landing page
│   │   ├── jobs/
│   │   │   └── index.js             # Job listings
│   │   └── login.js
│   ├── styles/
│   │   └── globals.css
│   ├── utils/
│   │   ├── api.js
│   │   └── filterHelpers.js
│   ├── next.config.js
│   └── package.json
│
├── docs/
│   ├── architecture-diagram.png     # System architecture diagram
│   ├── erd-diagram.png              # Database ERD diagram
│   └── PROJECT_DOCUMENTATION.md     # Detailed technical docs
│
├── NICEframeworkfinal.xlsx          # NICE Framework reference
├── .gitignore
├── package.json                     # Root package (concurrent)
└── README.md                        # This file
```

---

## Database Schema

For detailed ERD visualization, see `docs/erd-diagram.png`

### Tables Overview

**1. candidates**
- Stores candidate information
- Fields: candidate_id, name, email, phone, resume_path, created_at

**2. job_roles**
- Job postings and requirements
- Fields: role_id, title, description, requirements (JSON), status, recruiter_id

**3. applications**
- Links candidates to jobs
- Fields: application_id, candidate_id, role_id, status, applied_at

**4. ai_analysis**
- AI resume analysis results
- Fields: analysis_id, application_id, ai_score, skills_matched (JSON), skill_gaps (JSON), experience_years, experience_level, education, certifications (JSON), reasoning, top_strengths (JSON), top_gaps (JSON)

**5. tests**
- Test results and skill verification
- Fields: test_id, application_id, test_score, test_token, answers (JSON), verification_details (JSON), test_completed_at

**6. decisions**
- Composite scores and final decisions
- Fields: decision_id, application_id, composite_score, resume_weight, test_weight, decided_by

### Relationships

```
candidates (1) → (N) applications
job_roles (1) → (N) applications
applications (1) → (1) ai_analysis
applications (1) → (1) tests
applications (1) → (1) decisions
```

For detailed schema documentation, see `backend/data/csv/ERD_DOCUMENTATION.md`

---

## How It Works

### 1. Resume Parsing

**PDF Text Extraction:**
- Uses `pdf-parse` library to extract all readable text
- Extracts: contact info, work experience, skills, education, certifications, projects

**AI Analysis:**
- Sends extracted text + job requirements to AI (LLM)
- AI performs semantic matching (understands "Splunk" = "SIEM")
- Returns structured data: skills, knowledge, tasks, experience, education, certifications

**Fallback Mode:**
- If AI unavailable, uses regex pattern matching
- Extracts certifications, education, experience years
- Matches skills against job requirements

### 2. Scoring Calculation

**Component Scores (0-100% each):**
- Skills Match: Percentage of required skills found
- Knowledge Match: Percentage of required knowledge areas found
- Tasks Match: Percentage of required tasks/experience found
- Certifications Match: Percentage of required certifications held
- Education Match: Degree level match

**Weighted Final Score:**
```
AI Score = (Skills × 40%) + (Knowledge × 25%) + (Tasks × 25%) + 
           (Certs × 5%) + (Education × 5%)
```

**Eligibility:**
- Score ≥ 60% → Eligible for test
- Score < 60% → Not eligible

### 3. Skill Testing

**Test Generation:**
- Maps candidate's claimed skills to test questions
- Selects 4-10 questions covering different skills
- Multiple choice format

**Skill Verification:**
- For each skill: calculates (correct answers / total questions) × 100
- Verified: ≥70% correct
- Unverified: <70% correct
- Untested: No questions available

### 4. Composite Score

**Experience-Based Weighting:**
- Determined from job's experience range average
- Entry (<2.5 years): 70% resume, 30% test
- Mid (2.5-4.5 years): 40% resume, 60% test
- Senior (>4.5 years): 30% resume, 70% test

**Calculation:**
```
Composite = (AI Score × Resume Weight) + (Test Score × Test Weight)
```

### 5. Dashboard Analytics

**Real-time Calculations:**
- Aggregates data from all tables
- Calculates statistics, distributions, rankings
- Identifies skill trends and gaps
- Ranks candidates by composite scores

---

## Testing the System

### Test with Existing Data

The system includes 931 candidates with 1,331 applications pre-loaded.

1. Login as recruiter (credentials above)
2. Explore dashboard analytics
3. Click on any job to see candidates
4. View individual candidate profiles
5. Check skill verification results

### Test New Application

**1. Prepare a Resume (PDF format)**

Sample content:
```
John Doe
john.doe@example.com | (555) 123-4567

PROFESSIONAL SUMMARY
Cybersecurity professional with 5 years of experience in SOC operations

EXPERIENCE
Security Analyst | ABC Company | 2020-2024
- Monitored SIEM alerts using Splunk
- Conducted incident response investigations
- Performed malware analysis

SKILLS
- SIEM (Splunk, QRadar)
- Incident Response
- Network Security
- Python scripting

EDUCATION
Bachelor of Science in Cybersecurity
XYZ University, 2019

CERTIFICATIONS
- CompTIA Security+
- CEH
```

**2. Submit Application**
- Logout from recruiter account
- Navigate to job listings
- Select a job and click "Apply"
- Upload resume and fill information
- Submit application

**3. Take Test (if eligible)**
- If AI score ≥ 60%, you'll receive test link
- Answer technical questions
- Submit test

**4. View Results**
- Login as recruiter
- Check dashboard for new application
- View candidate profile with scores

---

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

**Database errors:**
- Check `backend/database/recruitment.db` exists
- Verify file permissions
- Check console for specific error messages

**Module not found:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**Port 3000 in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Build errors:**
```bash
cd frontend
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

**API connection failed:**
- Verify backend is running on port 5001
- Check `APP_URL` in backend `.env`
- Check browser console for CORS errors

### AI Issues

**Resume parsing not working:**
- System automatically falls back to pattern matching
- Check backend console for AI errors
- Verify API key if using OpenRouter/OpenAI
- Try with mock mode first

**Inconsistent scores:**
- Temperature is set to 0 for consistency
- Same resume should get same score (±1-2%)
- If variation >5%, check AI provider status

### Upload Issues

**Resume upload fails:**
- Check file is PDF format
- Verify file size <10MB
- Check `backend/uploads/` directory exists
- Verify file permissions

**PDF parsing fails:**
- System uses fallback content
- Check PDF is not password-protected
- Try with a different PDF

---

## API Documentation

### Authentication

**POST /api/auth/register**
- Register new user
- Body: `{ email, password, role, name }`

**POST /api/auth/login**
- Login user
- Body: `{ email, password }`
- Returns: JWT token

### Jobs

**GET /api/jobs**
- Get all active jobs
- Public endpoint

**GET /api/jobs/:id**
- Get job details by ID
- Public endpoint

**GET /api/jobs/recruiter/my-jobs**
- Get recruiter's jobs
- Requires authentication

### Applications

**POST /api/applications/apply**
- Submit job application
- Body: FormData with resume file and candidate info
- Returns: Application ID, AI score, eligibility

**GET /api/applications/recruiter/all**
- Get all applications for recruiter
- Requires authentication
- Returns: Applications with scores and candidate info

**GET /api/applications/:id**
- Get application details
- Returns: Complete application with AI analysis and test results

**GET /api/applications/job/:jobId**
- Get all applications for specific job
- Requires authentication

### Tests

**GET /api/tests/:token**
- Get test questions for candidate
- Token provided after eligible application

**POST /api/tests/:token/submit**
- Submit test answers
- Body: `{ answers: [{question_id, selected}] }`
- Returns: Test score and skill verification

### Analytics

**GET /api/analytics/dashboard**
- Get dashboard analytics
- Requires authentication
- Returns: Aggregated statistics and insights

---

## Contributing

This is a demonstration project showcasing AI-powered recruitment. For production use, consider:

**Security Enhancements:**
- Implement rate limiting
- Add CSRF protection
- Enhance input validation
- Add file virus scanning
- Implement secure session management

**Scalability:**
- Migrate to PostgreSQL/MySQL
- Add Redis for caching
- Implement job queues for AI processing
- Add CDN for file storage

**Features:**
- Email notifications
- Calendar integration
- Video interview scheduling
- Collaborative hiring workflows
- Advanced analytics and reporting

---

## Contributors

- Harika Aakula
- Keerthi Vaddepalli
- Rohit Reddy Chinthala
- Naresh Arepalli

---

Built as an AI-powered recruitment platform demonstration showcasing resume parsing, automated candidate scoring, skill verification, and data-driven recruitment insights.
