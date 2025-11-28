# Database ERD Documentation

## Tables Overview (6 Tables)

### 1. candidates
**Purpose:** Stores candidate/applicant information

| Column | Type | Description |
|--------|------|-------------|
| candidate_id | PK | Unique candidate identifier |
| name | String | Full name |
| email | String | Email address |
| phone | String | Phone number |
| resume_path | String | Path to uploaded resume |
| created_at | DateTime | Registration timestamp |

---

### 2. job_roles
**Purpose:** Job postings created by recruiters

| Column | Type | Description |
|--------|------|-------------|
| role_id | PK | Unique job role identifier |
| title | String | Job title |
| description | Text | Job description |
| requirements | Text | Job requirements |
| salary_range | String | Salary range |
| status | String | open/closed |
| recruiter_id | FK | Links to users table |
| created_at | DateTime | Job posting timestamp |

---

### 3. applications
**Purpose:** Junction table linking candidates to jobs (who applied to what)

| Column | Type | Description |
|--------|------|-------------|
| application_id | PK | Unique application identifier |
| candidate_id | FK | Links to candidates |
| role_id | FK | Links to job_roles |
| status | String | pending/in_progress/completed |
| applied_at | DateTime | Application submission time |
| updated_at | DateTime | Last update time |

---

### 4. ai_analysis
**Purpose:** AI resume screening and analysis results

| Column | Type | Description |
|--------|------|-------------|
| analysis_id | PK | Unique analysis identifier |
| application_id | FK | Links to applications |
| ai_score | Integer | AI score (0-100) |
| skills_matched | JSON | Array of matched skills |
| skill_gaps | JSON | Array of missing skills |
| experience_years | Integer | Years of experience |
| experience_level | String | Entry/Mid/Senior |
| education | String | Education background |
| certifications | JSON | Array of certifications |
| reasoning | Text | AI reasoning/explanation |
| top_strengths | JSON | AI-identified top strengths |
| top_gaps | JSON | AI-identified improvement areas |
| created_at | DateTime | Analysis timestamp |

---

### 5. tests
**Purpose:** Test results and skill verification

| Column | Type | Description |
|--------|------|-------------|
| test_id | PK | Unique test identifier |
| application_id | FK | Links to applications |
| test_score | Integer | Overall test score (0-100) |
| test_token | String | Unique test access token |
| test_completed_at | DateTime | Test completion time |
| answers | JSON | Array of question answers |
| verification_details | JSON | Skill-by-skill performance |
| created_at | DateTime | Test creation timestamp |

**Note:** Old columns excluded: verified_skills, unverified_skills, untested_skills

---

### 6. decisions
**Purpose:** Final composite scores and hiring decisions

| Column | Type | Description |
|--------|------|-------------|
| decision_id | PK | Unique decision identifier |
| application_id | FK | Links to applications |
| composite_score | Float | Final weighted score |
| resume_weight | Integer | Resume weight % (e.g., 40) |
| test_weight | Integer | Test weight % (e.g., 60) |
| decided_by | FK | Links to users (recruiter) |

**Formula:** `composite_score = (ai_score × resume_weight/100) + (test_score × test_weight/100)`

**Note:** Unused columns excluded: final_decision, decision_notes, decided_at

---

## Entity Relationship Diagram

```
┌─────────────────┐
│   job_roles     │
│   (role_id)     │
│                 │
│ - title         │
│ - description   │
│ - requirements  │
│ - salary_range  │
│ - status        │
│ - recruiter_id  │
└────────┬────────┘
         │
         │ 1:N (one job has many applications)
         │
         ▼
┌─────────────────┐         ┌─────────────────┐
│  applications   │◄────────│   candidates    │
│(application_id) │   N:1   │ (candidate_id)  │
│                 │         │                 │
│ - candidate_id  │         │ - name          │
│ - role_id       │         │ - email         │
│ - status        │         │ - phone         │
│ - applied_at    │         │ - resume_path   │
└────────┬────────┘         └─────────────────┘
         │
         │ 1:1 (each application has one analysis)
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  ai_analysis    │ │     tests       │ │   decisions     │
│  (analysis_id)  │ │   (test_id)     │ │ (decision_id)   │
│                 │ │                 │ │                 │
│ - ai_score      │ │ - test_score    │ │ - composite_    │
│ - skills_       │ │ - test_token    │ │   score         │
│   matched       │ │ - answers       │ │ - resume_weight │
│ - skill_gaps    │ │ - verification_ │ │ - test_weight   │
│ - reasoning     │ │   details       │ │ - decided_by    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Relationship Details

### Core Flow:
1. **Candidate applies to Job Role** → Creates `application`
2. **Application gets AI analyzed** → Creates `ai_analysis` record
3. **Eligible candidates take test** → Creates `tests` record
4. **System calculates composite** → Creates `decisions` record

### Relationships:
- `job_roles` **1:N** `applications` (one job, many applicants)
- `candidates` **1:N** `applications` (one person, many applications)
- `applications` **1:1** `ai_analysis` (each application analyzed once)
- `applications` **1:1** `tests` (each application has one test)
- `applications` **1:1** `decisions` (each application has one decision)

---

## Application Status Flow

```
pending → in_progress → completed
   ↓           ↓            ↓
Applied   AI Analysis   Test Done
          Created       Decision Made
```

---

## Composite Score Calculation

**Example:**
- AI Score: 85%
- Test Score: 75%
- Resume Weight: 40
- Test Weight: 60

**Calculation:**
```
composite_score = (85 × 0.4) + (75 × 0.6)
                = 34 + 45
                = 79%
```

**Weight Distribution by Experience Level:**
- Entry-level: Resume 70%, Test 30%
- Mid-level: Resume 40%, Test 60%
- Senior-level: Resume 30%, Test 70%

---

## Notes

### Excluded Columns:
- **job_roles.location** - Not displayed in UI
- **tests.verified_skills, unverified_skills, untested_skills** - Old schema, replaced by verification_details
- **decisions.final_decision, decision_notes, decided_at** - Not used in current implementation

### JSON Field Formats:

**skills_matched / skill_gaps:**
```json
["Incident Response", "Digital evidence collection", "malware analysis"]
```

**certifications:**
```json
["CompTIA Security+", "GCIH", "CEH"]
```

**verification_details:**
```json
[
  {"skill": "Incident Response", "score": 85, "status": "passed"},
  {"skill": "malware analysis", "score": 80, "status": "passed"}
]
```

**answers:**
```json
[
  {"question_id": 1, "selected": 1, "correct": true},
  {"question_id": 2, "selected": 0, "correct": false}
]
```
