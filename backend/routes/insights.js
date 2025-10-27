const express = require('express');
const db = require('../database/init');

const router = express.Router();

// Get market insights - ERD compliant
router.get('/market', (req, res) => {
  // Get job statistics from ERD structure
  db.all('SELECT role_id as id, role_name as title, role_description as requirements, min_ai_score_threshold as threshold_score FROM job_role_table', (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate market insights
    const totalJobs = jobs.length;
    const avgThreshold = Math.round(jobs.reduce((sum, job) => sum + job.threshold_score, 0) / jobs.length);
    
    // Job categories analysis
    const jobCategories = {
      'Software Development': jobs.filter(job => 
        job.title.toLowerCase().includes('developer') || 
        job.title.toLowerCase().includes('software') ||
        job.title.toLowerCase().includes('full stack')
      ).length,
      'Data & AI': jobs.filter(job => 
        job.title.toLowerCase().includes('data') || 
        job.title.toLowerCase().includes('machine learning')
      ).length,
      'Design & UX': jobs.filter(job => 
        job.title.toLowerCase().includes('design') || 
        job.title.toLowerCase().includes('ux')
      ).length,
      'Marketing': jobs.filter(job => 
        job.title.toLowerCase().includes('marketing')
      ).length,
      'DevOps & Infrastructure': jobs.filter(job => 
        job.title.toLowerCase().includes('devops')
      ).length
    };

    // Salary benchmarking data
    const salaryData = {
      'Senior Software Developer': { min: 120000, max: 180000, avg: 150000, trend: 'up' },
      'Frontend React Developer': { min: 90000, max: 140000, avg: 115000, trend: 'up' },
      'Data Scientist': { min: 130000, max: 200000, avg: 165000, trend: 'up' },
      'Digital Marketing Manager': { min: 80000, max: 120000, avg: 100000, trend: 'stable' },
      'Full Stack Developer': { min: 100000, max: 160000, avg: 130000, trend: 'up' },
      'Machine Learning Engineer': { min: 140000, max: 220000, avg: 180000, trend: 'up' },
      'UX/UI Designer': { min: 85000, max: 130000, avg: 107500, trend: 'stable' },
      'DevOps Engineer': { min: 110000, max: 170000, avg: 140000, trend: 'up' }
    };

    // Skills in demand
    const skillsInDemand = [
      { skill: 'JavaScript', demand: 95, growth: '+12%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('javascript')).length },
      { skill: 'Python', demand: 90, growth: '+18%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('python')).length },
      { skill: 'React', demand: 85, growth: '+15%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('react')).length },
      { skill: 'Machine Learning', demand: 88, growth: '+25%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('machine learning')).length },
      { skill: 'AWS', demand: 82, growth: '+20%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('aws')).length },
      { skill: 'Node.js', demand: 78, growth: '+10%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('node')).length },
      { skill: 'SQL', demand: 92, growth: '+8%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('sql')).length },
      { skill: 'Docker', demand: 75, growth: '+22%', jobs: jobs.filter(j => j.requirements.toLowerCase().includes('docker')).length }
    ];

    // Market trends
    const marketTrends = [
      {
        trend: 'AI & Machine Learning',
        growth: '+35%',
        description: 'Highest growth in job postings, especially for ML Engineers and Data Scientists',
        impact: 'high',
        jobCount: jobs.filter(j => j.title.toLowerCase().includes('machine learning') || j.title.toLowerCase().includes('data')).length
      },
      {
        trend: 'Remote Work',
        growth: '+28%',
        description: 'Increased remote and hybrid opportunities across all tech roles',
        impact: 'high',
        jobCount: Math.floor(totalJobs * 0.8) // Assume 80% offer remote
      },
      {
        trend: 'Cloud Technologies',
        growth: '+22%',
        description: 'Strong demand for AWS, Azure, and GCP expertise',
        impact: 'medium',
        jobCount: jobs.filter(j => j.requirements.toLowerCase().includes('aws') || j.requirements.toLowerCase().includes('cloud')).length
      },
      {
        trend: 'Full Stack Development',
        growth: '+18%',
        description: 'Companies prefer versatile developers with both frontend and backend skills',
        impact: 'medium',
        jobCount: jobs.filter(j => j.title.toLowerCase().includes('full stack')).length
      }
    ];

    // Industry insights
    const industryInsights = {
      totalJobs,
      avgThreshold,
      avgSalary: Math.round(Object.values(salaryData).reduce((sum, data) => sum + data.avg, 0) / Object.keys(salaryData).length),
      competitionLevel: totalJobs > 6 ? 'Medium' : 'Low',
      jobGrowth: '+15%',
      salaryGrowth: '+8%'
    };

    res.json({
      overview: industryInsights,
      jobCategories,
      salaryData,
      skillsInDemand,
      marketTrends,
      lastUpdated: new Date().toISOString()
    });
  });
});

// Get recruiter analytics - ERD compliant
router.get('/recruiter/:recruiterId', (req, res) => {
  const { recruiterId } = req.params;
  
  // Get recruiter's jobs and applications from ERD structure
  db.all(`
    SELECT jr.role_id as id, jr.role_name as title, jr.min_ai_score_threshold as threshold_score,
           COUNT(ra.analysis_id) as application_count,
           AVG(ra.ai_match_score) as avg_ai_score,
           AVG(at.objective_test_score) as avg_test_score,
           COUNT(CASE WHEN ra.ai_match_score >= jr.min_ai_score_threshold THEN 1 END) as eligible_count,
           COUNT(CASE WHEN at.test_completed_at IS NOT NULL THEN 1 END) as completed_tests
    FROM job_role_table jr 
    LEFT JOIN resume_analysis_table ra ON jr.role_id = ra.role_id 
    LEFT JOIN assessment_table at ON ra.analysis_id = at.analysis_id
    WHERE jr.recruiter_id = ? 
    GROUP BY jr.role_id
  `, [recruiterId], (err, jobStats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get all applications for this recruiter from ERD structure
    db.all(`
      SELECT ra.analysis_id as id, ra.ai_match_score as ai_score, ra.application_date as created_at,
             at.objective_test_score as test_score, at.test_completed_at,
             jr.role_name as job_title, jr.min_ai_score_threshold as threshold_score,
             rd.hiring_status as status,
             CASE 
               WHEN ra.ai_match_score >= jr.min_ai_score_threshold THEN 'eligible'
               ELSE 'not_eligible'
             END as eligibility_status,
             CASE 
               WHEN at.test_completed_at IS NOT NULL THEN 'test_completed'
               WHEN at.test_link_token IS NOT NULL THEN 'test_assigned'
               ELSE 'no_test'
             END as test_status
      FROM resume_analysis_table ra
      JOIN job_role_table jr ON ra.role_id = jr.role_id
      LEFT JOIN assessment_table at ON ra.analysis_id = at.analysis_id
      LEFT JOIN recruiter_decision_table rd ON ra.analysis_id = rd.analysis_id
      WHERE jr.recruiter_id = ?
    `, [recruiterId], (err, applications) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate analytics from ERD data
      const totalApplications = applications.length;
      const eligibleApplications = applications.filter(app => app.eligibility_status === 'eligible').length;
      const completedTests = applications.filter(app => app.test_status === 'test_completed').length;
      const averageAIScore = totalApplications > 0 ? Math.round(applications.reduce((sum, app) => sum + (app.ai_score || 0), 0) / totalApplications) : 0;

      // Application trends (mock data)
      const applicationTrends = {
        thisWeek: Math.floor(totalApplications * 0.3),
        lastWeek: Math.floor(totalApplications * 0.25),
        growth: '+20%'
      };

      // Score distribution
      const scoreDistribution = {
        excellent: applications.filter(app => app.ai_score >= 90).length,
        good: applications.filter(app => app.ai_score >= 80 && app.ai_score < 90).length,
        average: applications.filter(app => app.ai_score >= 70 && app.ai_score < 80).length,
        belowAverage: applications.filter(app => app.ai_score < 70).length
      };

      // Top performing jobs
      const topJobs = jobStats
        .filter(job => job.application_count > 0)
        .sort((a, b) => b.application_count - a.application_count)
        .slice(0, 3);

      // Skills analysis (mock based on common patterns)
      const skillsAnalysis = {
        inDemand: [
          { skill: 'JavaScript', candidates: applications.filter(app => app.ai_insights && app.ai_insights.includes('JavaScript')).length },
          { skill: 'React', candidates: applications.filter(app => app.ai_insights && app.ai_insights.includes('React')).length },
          { skill: 'Python', candidates: applications.filter(app => app.ai_insights && app.ai_insights.includes('Python')).length }
        ],
        gaps: [
          { skill: 'TypeScript', missing: 3, priority: 'high' },
          { skill: 'AWS', missing: 2, priority: 'medium' },
          { skill: 'Docker', missing: 2, priority: 'medium' }
        ]
      };

      const analytics = {
        overview: {
          totalJobs: jobStats.length,
          totalApplications,
          eligibleApplications,
          completedTests,
          averageAIScore,
          eligibilityRate: totalApplications > 0 ? Math.round((eligibleApplications / totalApplications) * 100) : 0
        },
        trends: applicationTrends,
        scoreDistribution,
        topJobs,
        skillsAnalysis,
        jobPerformance: jobStats.map(job => ({
          ...job,
          eligibility_rate: job.application_count > 0 ? Math.round((job.eligible_count / job.application_count) * 100) : 0
        }))
      };

      res.json(analytics);
    });
  });
});

// Get personalized insights for a candidate
router.get('/personalized/:candidateId', (req, res) => {
  const { candidateId } = req.params;
  
  // This would typically analyze the candidate's profile, applications, and test results
  // For now, return mock personalized data
  const personalizedInsights = {
    recommendedJobs: [
      { jobId: 1, title: 'Senior Software Developer', matchScore: 87, reason: 'Strong JavaScript and React skills' },
      { jobId: 2, title: 'Frontend React Developer', matchScore: 92, reason: 'Perfect match for React expertise' },
      { jobId: 5, title: 'Full Stack Developer', matchScore: 78, reason: 'Good full-stack foundation' }
    ],
    skillGaps: [
      { skill: 'TypeScript', priority: 'high', jobsRequiring: 5 },
      { skill: 'AWS', priority: 'medium', jobsRequiring: 3 },
      { skill: 'Docker', priority: 'low', jobsRequiring: 2 }
    ],
    careerPath: {
      current: 'Mid-level Developer',
      next: 'Senior Developer',
      timeframe: '12-18 months',
      requirements: ['TypeScript', 'System Design', 'Leadership Skills']
    },
    salaryProjection: {
      current: 95000,
      potential: 130000,
      increase: '+37%'
    }
  };

  res.json(personalizedInsights);
});

module.exports = router;