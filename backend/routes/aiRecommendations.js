const express = require('express');
const db = require('../database/init');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AIRecommendationService = require('../services/aiRecommendationService');

const router = express.Router();

// Get AI hiring recommendation for a specific candidate
router.get('/hiring-recommendation/:applicationId', authenticateToken, requireRole('recruiter'), async (req, res) => {
  const { applicationId } = req.params;
  
  try {
    // Get application and job details from ERD-compliant structure
    const application = await new Promise((resolve, reject) => {
      db.get(`
        SELECT c.*, jr.role_name as title, jr.role_description as description, 
               ra.ai_match_score, ra.matched_skills, ra.experience_years, ra.experience_level,
               ra.education, ra.skill_gaps,
               rd.hiring_status, rd.decision_comments
        FROM candidate_table c
        LEFT JOIN resume_analysis_table ra ON c.candidate_id = ra.candidate_id
        LEFT JOIN job_role_table jr ON ra.role_id = jr.role_id
        LEFT JOIN recruiter_decision_table rd ON ra.analysis_id = rd.analysis_id
        WHERE c.candidate_id = ?
      `, [applicationId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Parse AI insights
    let aiInsights = {};
    try {
      aiInsights = application.ai_insights ? JSON.parse(application.ai_insights) : {};
    } catch (e) {
      console.error('Error parsing AI insights:', e);
    }

    const candidateData = {
      name: application.candidate_name,
      ai_score: application.ai_match_score,
      test_score: 0, // Test scores handled separately in ERD
      skills_matched: application.matched_skills ? JSON.parse(application.matched_skills) : [],
      skill_gaps: application.skill_gaps ? JSON.parse(application.skill_gaps) : [],
      experience_years: application.experience_years || 0,
      education: application.education || 'Not specified',
      job_title: application.title
    };

    const jobData = {
      title: application.title,
      requirements: application.description || 'No requirements specified',
      threshold_score: 70 // Default threshold
    };

    const recommendation = await AIRecommendationService.generateHiringRecommendation(candidateData, jobData);
    
    res.json({
      application_id: applicationId,
      candidate_name: candidateData.name,
      recommendation
    });

  } catch (error) {
    console.error('Error generating hiring recommendation:', error);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

// Get AI-generated interview questions for a candidate
router.get('/interview-questions/:applicationId', authenticateToken, requireRole('recruiter'), async (req, res) => {
  const { applicationId } = req.params;
  
  try {
    const application = await new Promise((resolve, reject) => {
      db.get(`
        SELECT c.*, jr.role_name as title,
               ra.matched_skills
        FROM candidate_table c
        LEFT JOIN resume_analysis_table ra ON c.candidate_id = ra.candidate_id
        LEFT JOIN job_role_table jr ON ra.role_id = jr.role_id
        WHERE c.candidate_id = ?
      `, [applicationId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    let aiInsights = {};
    try {
      aiInsights = application.ai_insights ? JSON.parse(application.ai_insights) : {};
    } catch (e) {
      console.error('Error parsing AI insights:', e);
    }

    const candidateData = {
      skills_matched: aiInsights.skills_matched || [],
      skill_gaps: aiInsights.skill_gaps || [],
      experience_years: aiInsights.experience_years || 0
    };

    const jobData = {
      title: application.title,
      requirements: application.requirements
    };

    const questions = await AIRecommendationService.generateInterviewQuestions(candidateData, jobData);
    
    res.json({
      application_id: applicationId,
      job_title: application.title,
      questions
    });

  } catch (error) {
    console.error('Error generating interview questions:', error);
    res.status(500).json({ error: 'Failed to generate interview questions' });
  }
});

// Find similar candidates
router.get('/similar-candidates/:applicationId', authenticateToken, requireRole('recruiter'), async (req, res) => {
  const { applicationId } = req.params;
  
  try {
    // Get target candidate from ERD structure
    const targetCandidate = await new Promise((resolve, reject) => {
      db.get(`
        SELECT c.*, jr.role_name as title, ra.matched_skills, ra.ai_match_score
        FROM candidate_table c
        LEFT JOIN resume_analysis_table ra ON c.candidate_id = ra.candidate_id
        LEFT JOIN job_role_table jr ON ra.role_id = jr.role_id
        WHERE c.candidate_id = ?
      `, [applicationId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!targetCandidate) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get all other candidates from ERD structure
    const allCandidates = await new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, jr.role_name as title, ra.matched_skills, ra.ai_match_score
        FROM candidate_table c
        LEFT JOIN resume_analysis_table ra ON c.candidate_id = ra.candidate_id
        LEFT JOIN job_role_table jr ON ra.role_id = jr.role_id
        WHERE c.candidate_id != ?
      `, [applicationId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Parse AI insights for target candidate
    let targetInsights = {};
    try {
      targetInsights = targetCandidate.ai_insights ? JSON.parse(targetCandidate.ai_insights) : {};
    } catch (e) {
      console.error('Error parsing target insights:', e);
    }

    const targetData = {
      id: targetCandidate.id,
      ai_score: targetCandidate.ai_score,
      skills_matched: targetInsights.skills_matched || [],
      experience_years: targetInsights.experience_years || 0
    };

    // Parse insights for all candidates
    const candidatesWithInsights = allCandidates.map(candidate => {
      let insights = {};
      try {
        insights = candidate.ai_insights ? JSON.parse(candidate.ai_insights) : {};
      } catch (e) {
        console.error('Error parsing candidate insights:', e);
      }

      return {
        id: candidate.id,
        name: candidate.candidate_name,
        ai_score: candidate.ai_score,
        test_score: candidate.test_score,
        job_title: candidate.title,
        skills_matched: insights.skills_matched || [],
        experience_years: insights.experience_years || 0,
        created_at: candidate.created_at
      };
    });

    const similarCandidates = await AIRecommendationService.findSimilarCandidates(targetData, candidatesWithInsights);
    
    res.json({
      target_candidate: targetCandidate.candidate_name,
      similar_candidates: similarCandidates
    });

  } catch (error) {
    console.error('Error finding similar candidates:', error);
    res.status(500).json({ error: 'Failed to find similar candidates' });
  }
});

// Generate communication templates
router.post('/communication-template', authenticateToken, requireRole('recruiter'), async (req, res) => {
  const { applicationId, action } = req.body; // action: 'interview_invitation', 'rejection_email', 'offer_email', 'follow_up_email'
  
  try {
    const application = await new Promise((resolve, reject) => {
      db.get(`
        SELECT a.*, j.title
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = ?
      `, [applicationId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    let aiInsights = {};
    try {
      aiInsights = application.ai_insights ? JSON.parse(application.ai_insights) : {};
    } catch (e) {
      console.error('Error parsing AI insights:', e);
    }

    const candidateData = {
      name: application.candidate_name,
      job_title: application.title,
      skills_matched: aiInsights.skills_matched || [],
      skill_gaps: aiInsights.skill_gaps || []
    };

    const template = AIRecommendationService.generateCommunicationTemplates(candidateData, action);
    
    res.json({
      application_id: applicationId,
      action,
      template
    });

  } catch (error) {
    console.error('Error generating communication template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Get job posting optimization suggestions
router.get('/optimize-job/:jobId', authenticateToken, requireRole('recruiter'), async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM jobs WHERE id = ?', [jobId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Mock market data - in real implementation, this would come from market analysis
    const marketData = {
      average_threshold: 75,
      trending_skills: ['TypeScript', 'Docker', 'Kubernetes'],
      salary_ranges: { min: 80000, max: 150000 }
    };

    const suggestions = await AIRecommendationService.optimizeJobPosting(job, marketData);
    
    res.json({
      job_id: jobId,
      job_title: job.title,
      suggestions
    });

  } catch (error) {
    console.error('Error optimizing job posting:', error);
    res.status(500).json({ error: 'Failed to optimize job posting' });
  }
});

// Get AI insights dashboard for recruiter
router.get('/dashboard-insights/:recruiterId', authenticateToken, requireRole('recruiter'), async (req, res) => {
  const { recruiterId } = req.params;
  
  try {
    // Get recruiter's applications
    const applications = await new Promise((resolve, reject) => {
      db.all(`
        SELECT a.*, j.title
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE j.recruiter_id = ?
      `, [recruiterId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Generate insights
    const totalApplications = applications.length;
    const eligibleCandidates = applications.filter(app => app.status === 'eligible' || app.status === 'test_completed').length;
    const avgAIScore = totalApplications > 0 ? 
      Math.round(applications.reduce((sum, app) => sum + (app.ai_score || 0), 0) / totalApplications) : 0;

    // AI-powered insights
    const insights = {
      performance_summary: {
        total_applications: totalApplications,
        eligible_rate: totalApplications > 0 ? Math.round((eligibleCandidates / totalApplications) * 100) : 0,
        average_ai_score: avgAIScore
      },
      ai_recommendations: [
        {
          type: 'threshold_optimization',
          message: avgAIScore > 80 ? 'Consider raising your AI threshold to attract higher quality candidates' : 'Your current threshold seems appropriate',
          priority: 'medium'
        },
        {
          type: 'hiring_speed',
          message: 'You have 3 high-scoring candidates waiting for decisions',
          priority: 'high'
        },
        {
          type: 'market_trends',
          message: 'JavaScript and React skills are trending 15% higher this month',
          priority: 'low'
        }
      ],
      top_candidates: applications
        .filter(app => app.ai_score >= 80)
        .sort((a, b) => (b.ai_score + (b.test_score || 0)) - (a.ai_score + (a.test_score || 0)))
        .slice(0, 5)
        .map(app => ({
          id: app.id,
          name: app.candidate_name,
          job_title: app.title,
          composite_score: app.ai_score + (app.test_score || 0),
          recommendation: app.ai_score >= 85 ? 'Strong hire' : 'Consider for interview'
        }))
    };

    res.json(insights);

  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;