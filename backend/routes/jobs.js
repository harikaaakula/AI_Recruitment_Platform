const express = require('express');
const db = require('../database/init');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all jobs (public) - ERD compliant
router.get('/', (req, res) => {
  db.all(`
    SELECT jr.role_id as id, jr.role_name as title, jr.role_description as description, 
           jr.min_ai_score_threshold as threshold_score, jr.recruiter_id, jr.created_at,
           u.name as recruiter_name 
    FROM job_role_table jr 
    JOIN users u ON jr.recruiter_id = u.id 
    ORDER BY jr.created_at DESC
  `, (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(jobs);
  });
});

// Get job by ID - ERD compliant
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT jr.role_id as id, jr.role_name as title, jr.role_description as description, 
           jr.min_ai_score_threshold as threshold_score, jr.recruiter_id, jr.created_at,
           u.name as recruiter_name 
    FROM job_role_table jr 
    JOIN users u ON jr.recruiter_id = u.id 
    WHERE jr.role_id = ?
  `, [id], (err, job) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  });
});

// Create job (recruiter only) - ERD compliant
router.post('/', authenticateToken, requireRole('recruiter'), (req, res) => {
  const { title, description, requirements, threshold_score = 70 } = req.body;
  const recruiter_id = req.user.id;

  db.run(
    'INSERT INTO job_role_table (role_name, role_description, min_ai_score_threshold, recruiter_id) VALUES (?, ?, ?, ?)',
    [title, description, threshold_score, recruiter_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create job' });
      }

      res.status(201).json({
        message: 'Job created successfully',
        job: { id: this.lastID, title, description, requirements, threshold_score }
      });
    }
  );
});

// Get recruiter's jobs - ERD compliant
router.get('/recruiter/my-jobs', authenticateToken, requireRole('recruiter'), (req, res) => {
  const recruiter_id = req.user.id;

  db.all(`
    SELECT role_id as id, role_name as title, role_description as description, 
           min_ai_score_threshold as threshold_score, recruiter_id, created_at
    FROM job_role_table 
    WHERE recruiter_id = ? 
    ORDER BY created_at DESC
  `, [recruiter_id], (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(jobs);
  });
});

module.exports = router;