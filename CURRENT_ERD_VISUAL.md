# 📊 Your Original ERD Visual Representation

## AI Recruitment Platform - Entity Relationship Diagram (Your Design)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    YOUR ORIGINAL ERD DESIGN                                            │
│                                      (5 Core Tables)                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│    job_role_table       │
├─────────────────────────┤
│ 🔑 role_id (PK)        │
│    role_name            │
│    role_description     │
│    min_ai_score_threshold│
│    recruiter_id         │
│    created_at           │
└─────────────────────────┘
            │
            │ 1:N (role_id)
            ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│   candidate_table       │         │  resume_analysis_table  │
├─────────────────────────┤         ├─────────────────────────┤
│ 🔑 candidate_id (PK)   │◄────────┤ 🔑 analysis_id (PK)    │
│    name                 │  1:N    │ 🔗 candidate_id (FK)   │
│    email (UNIQUE)       │         │ 🔗 role_id (FK)        │
│    phone                │         │    ai_match_score       │
│    created_at           │         │    matched_skills       │
└─────────────────────────┘         │    application_date     │
                                    │    resume_path          │
                                    │    skill_gaps           │
                                    │    experience_years     │
                                    │    experience_level     │
                                    │    education            │
                                    │    certifications       │
                                    └─────────────────────────┘
                                                │
                                                │ 1:1 (analysis_id)
                                                ▼
                                    ┌─────────────────────────┐
                                    │   assessment_table      │
                                    ├─────────────────────────┤
                                    │ 🔑 assessment_id (PK)  │
                                    │ 🔗 analysis_id (FK)    │
                                    │    objective_test_score │
                                    │    test_link_token      │
                                    │    test_completed_at    │
                                    │    test_duration        │
                                    │    answers              │
                                    └─────────────────────────┘
                                                │
                                                │ 1:1 (analysis_id)
                                                ▼
                                    ┌─────────────────────────┐
                                    │ recruiter_decision_table│
                                    ├─────────────────────────┤
                                    │ 🔑 decision_id (PK)    │
                                    │ 🔗 analysis_id (FK)    │
                                    │    composite_fit_score  │
                                    │    experience_level     │
                                    │    resume_weightage     │
                                    │    test_weightage       │
                                    │    weighted_resume_score│
                                    │    weighted_test_score  │
                                    │    hiring_status        │
                                    │    decision_comments    │
                                    │    decision_date        │
                                    │    recruiter_id         │
                                    └─────────────────────────┘

```

## 🔗 Relationship Summary (Your Original Design)

### **Primary Relationships:**
1. **job_role_table** → **resume_analysis_table** (1:N)
   - One job role can have multiple candidate applications

2. **candidate_table** → **resume_analysis_table** (1:N)
   - One candidate can apply for multiple roles

3. **resume_analysis_table** → **assessment_table** (1:1)
   - Each resume analysis has one corresponding test assessment

4. **resume_analysis_table** → **recruiter_decision_table** (1:1)
   - Each resume analysis has one final recruiter decision

### **Note:** 
- `recruiter_id` in job_role_table and recruiter_decision_table are simple INTEGER fields
- No formal FK relationship to users table (as users table wasn't in your original ERD)

## 📋 Table Details (Your Original 5 Tables)

### **candidate_table**
- **Purpose**: Store basic candidate information
- **Key Fields**: candidate_id, name, email, phone
- **Constraints**: email UNIQUE

### **job_role_table**
- **Purpose**: Store job role definitions and requirements
- **Key Fields**: role_id, role_name, role_description, min_ai_score_threshold
- **Relationships**: Central table that connects to resume_analysis_table
- **Note**: recruiter_id is a simple integer field (not FK in your original design)

### **resume_analysis_table**
- **Purpose**: Core table storing AI analysis of candidate resumes
- **Key Fields**: analysis_id, ai_match_score, matched_skills, skill_gaps
- **Relationships**: Links candidate to job role
- **Special**: Contains AI-generated insights and scoring

### **assessment_table**
- **Purpose**: Store objective test results and performance data
- **Key Fields**: assessment_id, objective_test_score, test_link_token
- **Relationships**: One-to-one with resume_analysis_table

### **recruiter_decision_table**
- **Purpose**: Store final hiring decisions with weighted scoring
- **Key Fields**: decision_id, composite_fit_score, hiring_status
- **Relationships**: Links to resume analysis and recruiter
- **Special**: Implements weighted scoring algorithm

## 🎯 Key Features Supported

✅ **AI-Powered Resume Analysis**
✅ **Weighted Scoring System** (Entry: 70%R+30%T, Mid: 40%R+60%T, Senior: 30%R+70%T, Lead: 25%R+75%T)
✅ **Comprehensive Candidate Tracking**
✅ **Multi-Role Applications**
✅ **Test Assessment Integration**
✅ **Recruiter Decision Management**
✅ **AI Recommendations System**

## 🔄 Data Flow

1. **Candidate Application**: candidate_table → resume_analysis_table
2. **AI Analysis**: AI processes resume → stores in resume_analysis_table
3. **Test Assignment**: assessment_table created with test_link_token
4. **Test Completion**: objective_test_score updated in assessment_table
5. **Weighted Scoring**: composite_fit_score calculated in recruiter_decision_table
6. **Final Decision**: hiring_status updated by recruiter

---

**Status**: ✅ **Current and Fully Implemented**
**Last Updated**: October 26, 2025
**AI Recommendations**: ✅ **Fully Integrated**