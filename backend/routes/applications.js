const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const db = require('../database/init');
const { parseResume } = require('../services/aiService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Apply for job
router.post('/apply', upload.single('resume'), async (req, res) => {
  try {
    const { job_id, candidate_name, candidate_email, candidate_phone } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Resume file is required' });
    }

    // Get job details
    db.get('SELECT * FROM jobs WHERE id = ?', [job_id], async (err, job) => {
      if (err || !job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      try {
        // Parse PDF resume
        const resumeBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(resumeBuffer);
        const resumeText = pdfData.text;

        // Get AI score and detailed analysis
        const aiResult = await parseResume(resumeText, job.requirements);
        const aiScore = aiResult.score;

        // Determine eligibility
        const status = aiScore >= job.threshold_score ? 'eligible' : 'not_eligible';

        // Save application with AI insights
        db.run(
          `INSERT INTO applications 
           (job_id, candidate_email, candidate_name, candidate_phone, resume_path, ai_score, status, ai_insights) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [job_id, candidate_email, candidate_name, candidate_phone, req.file.path, aiScore, status, JSON.stringify(aiResult)],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to save application' });
            }

            res.status(201).json({
              message: 'Application submitted successfully',
              application: {
                id: this.lastID,
                ai_score: aiScore,
                status,
                eligible_for_test: status === 'eligible',
                ai_insights: aiResult
              }
            });
          }
        );
      } catch (parseError) {
        console.error('Resume parsing error:', parseError);
        res.status(500).json({ error: 'Failed to parse resume' });
      }
    });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get applications for a job (recruiter only)
router.get('/job/:jobId', authenticateToken, requireRole('recruiter'), (req, res) => {
  const { jobId } = req.params;

  db.all(`
    SELECT a.*, j.title as job_title 
    FROM applications a 
    JOIN jobs j ON a.job_id = j.id 
    WHERE a.job_id = ? AND j.recruiter_id = ?
    ORDER BY a.created_at DESC
  `, [jobId, req.user.id], (err, applications) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(applications);
  });
});

// Get all applications for recruiter - ERD compliant
router.get('/recruiter/all', authenticateToken, requireRole('recruiter'), (req, res) => {
  db.all(`
    SELECT ra.analysis_id as id, c.candidate_id, c.name as candidate_name, c.email as candidate_email, 
           c.phone as candidate_phone, jr.role_name as job_title, ra.ai_match_score as ai_score,
           ra.application_date as created_at, ra.experience_level, ra.experience_years,
           at.objective_test_score as test_score, rd.hiring_status as status,
           rd.composite_fit_score
    FROM resume_analysis_table ra
    JOIN candidate_table c ON ra.candidate_id = c.candidate_id
    JOIN job_role_table jr ON ra.role_id = jr.role_id
    LEFT JOIN assessment_table at ON ra.analysis_id = at.analysis_id
    LEFT JOIN recruiter_decision_table rd ON ra.analysis_id = rd.analysis_id
    WHERE jr.recruiter_id = ?
    ORDER BY ra.application_date DESC
  `, [req.user.id], (err, applications) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(applications);
  });
});

// Get application by ID - ERD compliant
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT ra.analysis_id as id, c.candidate_id, c.name as candidate_name, c.email as candidate_email, 
           c.phone as candidate_phone, jr.role_name as job_title, jr.role_description as job_description,
           ra.ai_match_score as ai_score, ra.application_date as created_at, ra.experience_level, 
           ra.experience_years, ra.matched_skills, ra.skill_gaps, ra.education, ra.certifications,
           at.objective_test_score as test_score, at.test_completed_at, at.answers,
           rd.hiring_status as status, rd.composite_fit_score, rd.decision_comments
    FROM resume_analysis_table ra
    JOIN candidate_table c ON ra.candidate_id = c.candidate_id
    JOIN job_role_table jr ON ra.role_id = jr.role_id
    LEFT JOIN assessment_table at ON ra.analysis_id = at.analysis_id
    LEFT JOIN recruiter_decision_table rd ON ra.analysis_id = rd.analysis_id
    WHERE ra.analysis_id = ?
  `, [id], (err, application) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(application);
  });
});

module.exports = router;