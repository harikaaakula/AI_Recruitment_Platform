# 🤖 AI-Powered Recruitment Platform

An intelligent recruitment system that uses AI to analyze resumes, score candidates, verify skills through automated tests, and provide actionable insights to recruiters.

---

## � Table of Contents

- [📋 Overview](#-overview)
- [🏗️ System Architecture](#️-system-architecture)
- [📊 Recruiter Dashboard Features](#-recruiter-dashboard-features)
- [🎯 Job-Specific Page Features](#-job-specific-page-features)
- [👤 Candidate Profile Page Features](#-candidate-profile-page-features)
- [🔄 Candidate Application Flow](#-candidate-application-flow)
- [📦 Dummy Data Generation](#-dummy-data-generation)
- [📁 Project Structure](#-project-structure)
- [🚀 How to Run Locally](#-how-to-run-locally)
- [🔐 Environment Variables](#-environment-variables)
- [📸 Screenshots](#-screenshots)
- [🧪 Testing the System](#-testing-the-system)
- [🔧 Troubleshooting](#-troubleshooting)
- [📚 Additional Documentation](#-additional-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👥 Credits](#-credits)

---

## 📋 Overview

The AI-Powered Recruitment Platform streamlines the hiring process by automatically:
- **Parsing resumes** to extract candidate information, skills, education, and certifications
- **Scoring candidates** using AI-based matching against job requirements
- **Administering skill tests** to verify claimed competencies
- **Providing analytics** including skill gaps, quality distributions, and top candidate recommendations
- **Supporting weighted scoring** based on experience level (entry/mid/senior/lead)

The platform features a comprehensive recruiter dashboard with real-time insights, job-specific candidate views, and detailed candidate profiles with skill verification results.

---

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- React.js with Next.js framework
- Tailwind CSS for styling
- Context API for state management
- Axios for API communication

**Backend:**
- Node.js with Express.js
- SQLite database for data persistence
- JWT authentication
- Multer for file uploads
- PDF parsing for resume extraction

**AI/ML Pipeline:**
- OpenRouter API with DeepSeek (free tier)
- Fallback to pattern-based extraction
- Custom matching engine for scoring
- Skill verification through test results

**Data Generation:**
- Python script for generating realistic dummy data
- 1,086 pre-generated applications across 20 job roles
- CSV-based data storage and database seeding

### System Flow

```
Candidate Application Flow:
1. Candidate uploads resume (PDF)
2. Backend extracts text from PDF
3. AI analyzes resume and extracts structured data
4. Matching engine calculates AI score against job requirements
5. Application status determined (eligible/not_eligible)
6. If eligible, candidate takes skill-specific test
7. Test results verify claimed skills
8. Weighted composite score calculated
9. Data displayed on recruiter dashboard

Recruiter View Flow:
1. Recruiter logs in
2. Dashboard loads aggregated metrics from database
3. Recruiter can view:
   - Overall statistics (jobs, candidates, scores)
   - Job-specific analytics
   - Individual candidate profiles
   - Skill insights and gaps
```

---

## 📊 Recruiter Dashboard Features

### Overview Cards (Top Row)

#### 1. Total Jobs 💼
- **What it shows**: Number of active job postings
- **Calculation**: `COUNT(*) FROM job_roles WHERE status = 'active'`
- **Data source**: `job_roles` table

#### 2. Total Candidates 👥
- **What it shows**: Total applications across all jobs
- **Calculation**: `COUNT(*) FROM applications`
- **Data source**: `applications` table

#### 3. Eligible Candidates ✅
- **What it shows**: Candidates who passed both AI screening AND skill test
- **Calculation**: `COUNT(*) WHERE status = 'test_completed' AND test_score >= 70`
- **Tooltip**: "Candidates whose AI score met the job threshold AND who passed the job-specific assessment (test score ≥ 70%)"
- **Data source**: `applications` + `tests` tables

#### 4. Average AI Score 🤖
- **What it shows**: Mean AI resume screening score across all candidates
- **Calculation**: `AVG(ai_score) FROM ai_analysis`
- **Tooltip**: "Average AI resume screening score across all candidates. Evaluates skills match, experience, and qualifications"
- **Data source**: `ai_analysis` table

#### 5. Average Test Score 📝
- **What it shows**: Mean test score for candidates who completed assessments
- **Calculation**: `AVG(test_score) FROM tests WHERE test_score IS NOT NULL`
- **Tooltip**: "Average score for candidates who completed job-specific technical assessments. Passing threshold is 70%"
- **Data source**: `tests` table

### Analytics Visualizations

#### Application Status Distribution
- **Visual**: Horizontal bar chart with percentages
- **Categories**:
  - Test Passed (≥70%) - Green
  - Test Failed (<70%) - Yellow  
  - Not Eligible (Low AI Score) - Red
- **Calculation**: Percentage of total applications in each category
- **Data source**: `applications` + `tests` tables

#### AI Score Distribution
- **Visual**: Color-coded list with counts
- **Ranges**:
  - 90-100% (Excellent) - Green
  - 80-89% (Good) - Blue
  - 70-79% (Fair) - Yellow
  - 60-69% (Below Average) - Orange
  - Below 60% (Poor) - Red
- **Calculation**: `COUNT(*) GROUP BY score_range`
- **Data source**: `ai_analysis` table

### Job Performance Analytics Table

**Columns:**
- **Job Title**: Clickable link to job-specific page
- **Applications**: Total candidates who applied
- **Eligible Rate**: Percentage who passed screening (color-coded)
- **Avg AI Score**: Mean AI score for this job
- **Avg Test Score**: Mean test score for this job
- **Action**: "View Candidates →" link

**Calculations:**
- Eligible Rate: `(eligible_count / total_applications) * 100`
- Color coding: Green (≥50%), Yellow (≥25%), Red (<25%)

**Data source**: Aggregated from `applications`, `ai_analysis`, `tests` tables

### Candidate Skill Insights

#### Most In-Demand Skills
- **What it shows**: Top 5 skills most candidates possess
- **Calculation**: 
  - Parse `skills_matched` JSON from all applications
  - Count occurrences of each skill
  - Sort by frequency, take top 5
- **Visual**: Progress bars showing demand percentage
- **Data source**: `ai_analysis.skills_matched` (JSON field)

#### Common Skill Gaps
- **What it shows**: Top 4 skills most candidates are missing
- **Calculation**:
  - Parse `skill_gaps` JSON from all applications
  - Count occurrences of each gap
  - Calculate priority based on percentage:
    - **High Priority** (Red): >30% of candidates missing
    - **Medium Priority** (Yellow): 15-30% missing
    - **Low Priority** (Green): <15% missing
- **Tooltip**: Explains priority calculation on hover (ℹ️ icon)
- **Data source**: `ai_analysis.skill_gaps` (JSON field)

### Recent Applications Table

**Displays**: Latest 10 applications with:
- Candidate name and email
- Job title
- AI Score (color-coded badge)
- Test Score (color-coded badge or "-")
- Status (color-coded badge)
- Applied date
- "View Analysis" button

**Data source**: `applications` JOIN `candidates`, `job_roles`, `ai_analysis`, `tests`

### Top Candidates This Week 🌟

**What it shows**: Top 5 candidates by weighted composite score

**Weighted Scoring Formula:**
- **Entry Level**: (AI Score × 0.70) + (Test Score × 0.30)
- **Mid Level**: (AI Score × 0.40) + (Test Score × 0.60)
- **Senior Level**: (AI Score × 0.30) + (Test Score × 0.70)
- **Lead Level**: (AI Score × 0.25) + (Test Score × 0.75)

**Rationale**: Senior roles prioritize practical skills (test), entry roles prioritize potential (resume)

**Display per candidate:**
- Name and job title
- AI Score badge (blue)
- Test Score badge (green)
- Weighted Composite Score (large purple number)
- Experience level with weightage breakdown
- "View Profile →" link

**Data source**: Calculated from `ai_analysis` + `tests`, sorted by weighted score

---

## 🎯 Job-Specific Page Features

**URL**: `/recruiter/jobs/[jobId]/candidates`

### Job Header
- Job title, description, requirements
- Salary range
- Posted date
- Status badge (active/closed)

### Statistics Cards

1. **Total Applicants**: Count of all candidates for this job
2. **Eligible**: Count and pass rate percentage
3. **Tests Completed**: Count and completion rate
4. **Avg AI Score**: Mean AI score for this job

### Job-Specific Insights

#### Quality Distribution 📊
- **Visual**: Progress bars for three quality tiers
- **Categories**:
  - Excellent (80-100%) - Green
  - Good (60-79%) - Yellow
  - Below Threshold (<60%) - Red
- **Tooltip**: Explains how quality is calculated based on AI score
- **Calculation**: `COUNT(*) WHERE ai_score IN range / total * 100`

#### Skill Match Analysis 🎯
- **Shows**: Top 3 most common skill gaps for this job
- **Display**: Skill name, count of candidates missing it, percentage
- **Purpose**: Helps recruiters identify if job requirements are too strict
- **Tip**: "Consider: Adjust requirements or provide training for these skills"

#### Top 3 Candidates ⭐
- **Shows**: Best 3 candidates by average score (AI + Test) / 2
- **Display**: Name, email, scores, badges, "View Full Profile" link
- **Filter**: Only candidates who completed tests

### Candidates Table

**Features:**
- Sortable by: Date Applied, AI Score, Test Score
- Circular progress indicator for AI score (color-coded)
- Test score badge or "Not taken"
- Status badge
- Applied date
- Actions: "Details" (expand) + "Profile" (view full)

**Expandable Rows:**
Clicking "Details" shows skill verification grid:
- ✅ **Verified Skills** (green): Skills proven through test
- ❌ **Unverified Skills** (red): Claimed but not demonstrated
- ⚠️ **Untested Skills** (yellow): Not covered by test questions

**Data source**: `applications` filtered by `role_id`, joined with all related tables

---

## 👤 Candidate Profile Page Features

**URL**: `/recruiter/applications/[id]`

### Left Sidebar

#### Candidate Information
- Name, email, phone
- Job applied for
- Application date
- Status badge (color-coded)

#### Score Summary
- **AI Resume Score**: Percentage with progress bar (blue)
- **Test Score**: Percentage with progress bar (green) - if completed
- **Overall Compatibility**: 
  - **Weighted composite score** (purple, large)
  - Shows calculation: "mid level (40% Resume + 60% Test)"
  - If no test: Shows AI score only

### Main Content Area

#### Skills Analysis
**Two-column layout:**

**Left: ✓ Matched Skills** (Green)
- Each skill shows name and proficiency level badge
- Levels: expert (green), intermediate (yellow), beginner (gray)

**Right: ⚠ Skill Gaps** (Red)
- Each gap shows name and priority badge
- Priority: high (red), medium (orange)

#### Experience & Education
**Three-column layout:**

1. **Experience**: Years (large number) + level (entry/mid/senior)
2. **Education**: Degree level + field of study
3. **Certifications**: Badge list (shows first 3, then "+X more")

#### Strengths & Recommendations
**Two-column layout:**

**Left: Strengths** (Green theme)
- Auto-generated from profile data
- Examples: "5 skills matched", "3 years experience", "2 certifications"

**Right: Recommendations** (Orange theme)
- Based on skill gaps and experience
- Examples: "Develop expertise in: X, Y", "Consider obtaining certifications"

#### Test Performance
**Only shown if test completed**

**Metrics displayed:**
- Overall Score (blue card) - Percentage
- Completed On (purple card) - Date

**Skill Verification Section:**
Three-column grid showing:
- ✓ Verified Skills (green badges)
- ✗ Unverified Skills (red badges)
- ? Untested Skills (gray badges)

**Data source**: Single application with all joins: `applications` + `candidates` + `job_roles` + `ai_analysis` + `tests`

---

## 🔄 Candidate Application Flow

### Step-by-Step Process

#### 1. Candidate Uploads Resume
- **Frontend**: File upload form at `/apply`
- **Validation**: PDF files only, max size check
- **Action**: POST to `/api/applications/apply`

#### 2. Resume Text Extraction
- **Backend**: Multer receives file, saves to `backend/uploads/`
- **PDF Parsing**: `pdf-parse` library extracts text
- **Fallback**: If parsing fails, uses filename + mock content

#### 3. AI Analysis
- **Primary**: OpenRouter API with DeepSeek model
- **Prompt**: Structured JSON extraction of:
  - Years of experience
  - Skills, knowledge, tasks
  - Education level
  - Certifications
  - Job titles
- **Fallback**: Pattern-based extraction using regex if AI fails

#### 4. Resume Parsing Details

**Education Extraction:**
```javascript
// Extracts full degree name, not just "Bachelor's"
Pattern: /bachelor[^\n|]*/i
Result: "Bachelor of Science in Information Technology – Cybersecurity Focus"
```

**Certification Extraction:**
```javascript
// Deduplicates certifications using Set
Patterns: {
  'CompTIA Security+': /CompTIA\s+Security\+/gi,
  'CEH': /Certified\s+Ethical\s+Hacker|(?<!\w)CEH(?!\w)/gi,
  'CISSP': /(?<!\w)CISSP(?!\w)/gi,
  // ... more patterns
}
Result: ["CompTIA Security+", "CEH"] // No duplicates
```

**Skills Extraction:**
- Matches against job's required skills list
- Case-insensitive matching
- Returns array of matched skills

#### 5. AI Scoring
- **Matching Engine**: `backend/services/matchingEngine.js`
- **Calculation**:
  - Skill Match: (matched_skills / required_skills) × skill_weight
  - Knowledge Match: (matched_knowledge / required_knowledge) × knowledge_weight
  - Task Match: (matched_tasks / required_tasks) × task_weight
  - Experience Match: Bonus/penalty based on years
  - Final Score: Weighted sum of all components

#### 6. Application Creation
- **Database Insert**: Creates records in:
  - `candidates` table (if new)
  - `applications` table with status
  - `ai_analysis` table with scores and extracted data
- **Status Determination**:
  - `eligible`: AI score ≥ job threshold (typically 60-70%)
  - `not_eligible`: AI score < threshold

#### 7. Skill Test (If Eligible)
- **Test Assignment**: System generates test based on job category
- **Question Selection**: 
  - Maps candidate's claimed skills to test questions
  - Selects 4-10 questions covering different skills
  - Multiple choice format
- **Test Taking**: Candidate answers questions
- **Scoring**: Percentage of correct answers

#### 8. Skill Verification
- **Process**: For each claimed skill:
  - Find questions that test that skill
  - Calculate: (correct_answers / total_questions) × 100
  - **Verified**: ≥70% correct
  - **Unverified**: <70% correct
  - **Untested**: No questions available
- **Storage**: Results saved in `tests` table as JSON

#### 9. Final Status Update
- **Status**: Changed to `test_completed`
- **Composite Score**: Calculated using weighted formula
- **Dashboard Update**: New data immediately available

#### 10. Data Propagation
All views update automatically:
- ✅ Recruiter dashboard shows new application
- ✅ Job-specific page includes new candidate
- ✅ Candidate profile displays complete analysis
- ✅ Skill insights update with new data

---

## 📦 Dummy Data Generation

### Overview
The system includes 1,086 pre-generated applications to demonstrate functionality without requiring manual data entry.

### Generation Script
**Location**: `backend/scripts/generate_candidates.py`

**What it generates:**
- 1,086 unique candidates with realistic names and emails
- Applications distributed across 20 cybersecurity job roles
- AI scores ranging from 60-93% (realistic distribution)
- Test scores ranging from 0-93% (with 66.8% pass rate)
- Skills matched and gaps for each candidate
- Certifications (Security+, CEH, CISSP, etc.)
- Education levels (Associate's, Bachelor's, Master's)
- Experience years (0-11 years)

### Data Distribution

**Job Roles** (20 total):
- Security Analyst, Penetration Tester, Security Engineer
- SOC Analyst, Cloud Security Engineer, Incident Responder
- Vulnerability Analyst, Network Security Engineer
- Threat Intelligence Analyst, Application Security Engineer
- And 10 more specialized roles

**Score Ranges:**
- AI Scores: 60-93% (mean: 72.25%)
- Test Scores: 0-93% (mean: 77.72%)
- Eligible candidates: 725 (66.8%)
- Not eligible: 212 (19.5%)
- Test failed: 149 (13.7%)

**Date Ranges:**
- Applications: October 1, 2024 - November 16, 2025
- Realistic timestamps for applied_at, test_completed_at

**Skills Distribution:**
- Each candidate has 3-7 matched skills
- Each candidate has 2-5 skill gaps
- Skills are job-specific (e.g., SIEM for Security Analyst)

### Data Storage

**CSV Files** (in project root):
1. `generated_candidates.csv` - Candidate information
2. `generated_applications.csv` - Application records
3. `generated_tests.csv` - Test results and skill verification

**Database**: `backend/database/recruitment.db`
- SQLite database with 6 tables
- Pre-populated with all 1,086 applications
- Ready to use immediately after cloning

### Data Loading Process

**Initial Setup:**
1. Python script generates CSV files
2. CSV data is loaded into SQLite database
3. Database is committed to repository

**Runtime:**
- Backend reads from database (not CSV)
- CSV files serve as backup/reference
- New applications are stored directly in database

---

## 📁 Project Structure

```
sampleproject/
├── backend/
│   ├── data/
│   │   ├── jobRoles.js              # 20 job role definitions with requirements
│   │   └── testQuestions.js         # Question bank for skill tests
│   ├── database/
│   │   └── recruitment.db           # SQLite database (1,086 applications)
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication & role checking
│   ├── routes/
│   │   ├── applications_redesigned.js  # Application endpoints
│   │   ├── auth.js                  # Login/register endpoints
│   │   ├── jobs_redesigned.js       # Job endpoints
│   │   └── tests.js                 # Test endpoints
│   ├── scripts/
│   │   └── generate_candidates.py   # Data generation script
│   ├── services/
│   │   ├── aiService.js             # AI resume parsing & extraction
│   │   ├── improvementSuggestions.js # Candidate recommendations
│   │   └── matchingEngine.js        # Score calculation logic
│   ├── uploads/
│   │   └── .gitkeep                 # Resume upload directory
│   ├── .env                         # Environment variables (not in git)
│   ├── .env.example                 # Environment template
│   ├── package.json                 # Backend dependencies
│   └── server.js                    # Express server entry point
│
├── frontend/
│   ├── components/
│   │   ├── AIRecommendations.js    # Candidate recommendations display
│   │   ├── Layout.js                # Page layout wrapper
│   │   └── ScoringExplanation.js   # Scoring methodology modal
│   ├── context/
│   │   └── AuthContext.js           # Authentication state management
│   ├── pages/
│   │   ├── recruiter/
│   │   │   ├── applications/
│   │   │   │   └── [id].js          # Candidate profile page
│   │   │   ├── jobs/
│   │   │   │   └── [jobId]/
│   │   │   │       └── candidates.js # Job-specific candidates page
│   │   │   └── dashboard.js         # Main recruiter dashboard
│   │   ├── _app.js                  # Next.js app wrapper
│   │   ├── index.js                 # Landing page
│   │   └── login.js                 # Login page
│   ├── styles/
│   │   └── globals.css              # Global styles (Tailwind)
│   ├── utils/
│   │   └── api.js                   # API client functions
│   ├── package.json                 # Frontend dependencies
│   └── next.config.js               # Next.js configuration
│
├── generated_candidates.csv         # Generated candidate data
├── generated_applications.csv       # Generated application data
├── generated_tests.csv              # Generated test results
├── .gitignore                       # Git ignore rules
├── package.json                     # Root package.json
└── README.md                        # This file
```

### Key Directories Explained

**`backend/data/`**: Static data definitions
- Job roles with skills, knowledge, tasks requirements
- Test question bank mapped to skills

**`backend/database/`**: SQLite database
- Contains all application data
- 6 tables: candidates, applications, job_roles, ai_analysis, tests, decisions

**`backend/services/`**: Business logic
- AI parsing and extraction
- Matching and scoring algorithms
- Suggestion generation

**`backend/uploads/`**: Resume storage
- PDF files uploaded by candidates
- Cleaned on git (only .gitkeep tracked)

**`frontend/pages/recruiter/`**: Recruiter interface
- Dashboard with analytics
- Job-specific views
- Candidate profiles

**CSV files (root)**: Seed data
- Used to populate database initially
- Serve as backup/reference

---

## 🚀 How to Run Locally

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.x (only if regenerating data)

### Installation Steps

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd sampleproject
```

#### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

#### 4. Configure Environment Variables

Create `backend/.env` file (copy from `.env.example`):
```bash
cd ../backend
cp .env.example .env
```

Edit `.env` and configure:
```env
PORT=5001
JWT_SECRET=your_secret_key_here

# AI Provider (optional - works with mock by default)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_api_key_here  # Get free key from openrouter.ai
MODEL_NAME=deepseek/deepseek-chat-v3.1:free

APP_URL=http://localhost:3000
```

**Note**: The system works without an API key using pattern-based extraction. For better accuracy, get a free OpenRouter API key from https://openrouter.ai/keys

#### 5. Start Backend Server
```bash
cd backend
node server.js
```

Backend will start on http://localhost:5001

#### 6. Start Frontend Server
```bash
cd frontend
npm run dev
```

Frontend will start on http://localhost:3000

#### 7. Login as Recruiter

**Default Credentials:**
- Email: `recruiter@example.com`
- Password: `password123`

### Verification

After starting both servers:
1. Navigate to http://localhost:3000
2. Click "Login"
3. Use recruiter credentials
4. You should see the dashboard with 1,086 applications

---

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend server port | 5001 | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `APP_URL` | Frontend URL | http://localhost:3000 | Yes |

### Optional AI Configuration

| Variable | Description | Options |
|----------|-------------|---------|
| `AI_PROVIDER` | AI service to use | `openrouter`, `openai`, `mock` |
| `OPENROUTER_API_KEY` | OpenRouter API key | Get from openrouter.ai |
| `MODEL_NAME` | AI model to use | `deepseek/deepseek-chat-v3.1:free` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | Get from openai.com |

### Security Notes

- Never commit `.env` file to git
- Use `.env.example` as template
- Rotate JWT_SECRET in production
- Keep API keys confidential

---

## 📸 Screenshots

<!-- TODO: Add screenshots here -->

### Dashboard Overview
*Screenshot showing the main recruiter dashboard with overview cards, charts, and tables*

### Job-Specific View
*Screenshot showing the job candidates page with quality distribution and top candidates*

### Candidate Profile
*Screenshot showing detailed candidate profile with skills analysis and test results*

### Application Flow
*Screenshot showing the candidate application form and resume upload*

---

## 🧪 Testing the System

### Test Candidate Application

1. **Logout** from recruiter account
2. **Navigate** to application page
3. **Upload** a resume (PDF format)
4. **Fill** candidate information
5. **Submit** application
6. **Take** the skill test (if eligible)
7. **Login** as recruiter to see results

### Sample Resume Format

```
John Doe
Email: john.doe@example.com
Phone: (555) 123-4567

EDUCATION
Bachelor of Science in Information Technology
State University | 2020

CERTIFICATIONS
- CompTIA Security+
- Certified Ethical Hacker (CEH)

EXPERIENCE
Security Analyst - TechCorp Inc. (2020-2024)
- Monitored security alerts using SIEM tools
- Performed log analysis and threat detection

SKILLS
- SIEM tools, Log analysis, Threat detection
- Incident handling, Security monitoring
```

---

## 🔧 Troubleshooting

### Backend won't start
- Check if port 5001 is available
- Verify `.env` file exists
- Run `npm install` in backend directory

### Frontend won't start
- Check if port 3000 is available
- Run `npm install` in frontend directory
- Clear `.next` cache: `rm -rf .next`

### Database errors
- Database file should exist at `backend/database/recruitment.db`
- Check file permissions
- If corrupted, regenerate from CSV data

### Resume upload fails
- Check `backend/uploads/` directory exists
- Verify file is PDF format
- Check file size (max 10MB)

### AI extraction not working
- System falls back to pattern-based extraction automatically
- Check console logs for AI errors
- Verify API key if using OpenRouter/OpenAI

---

## 📚 Additional Documentation

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

**Jobs:**
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `GET /api/jobs/recruiter/my-jobs` - Get recruiter's jobs

**Applications:**
- `POST /api/applications/apply` - Submit application
- `GET /api/applications/recruiter/all` - Get all applications (recruiter)
- `GET /api/applications/:id` - Get application details
- `GET /api/applications/job/:jobId` - Get applications for job

**Tests:**
- `GET /api/tests/:token` - Get test questions
- `POST /api/tests/:token/submit` - Submit test answers

### Database Schema

**Tables:**
1. `candidates` - Candidate information
2. `applications` - Application records
3. `job_roles` - Job definitions
4. `ai_analysis` - AI scoring results
5. `tests` - Test results and skill verification
6. `decisions` - Final hiring decisions

---

## 🤝 Contributing

This is a demonstration project. For production use, consider:
- Adding user registration flow
- Implementing email notifications
- Adding more robust authentication
- Scaling database to PostgreSQL/MySQL
- Adding file validation and virus scanning
- Implementing rate limiting
- Adding comprehensive error handling

---

## 📄 License

This project is for demonstration purposes.

---

## 👥 Credits

Built as an AI-powered recruitment platform demonstration showcasing:
- Resume parsing and analysis
- Automated candidate scoring
- Skill verification through testing
- Data-driven recruitment insights

---

**Last Updated**: November 16, 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
