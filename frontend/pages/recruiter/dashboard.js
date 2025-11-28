import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { jobsAPI, applicationsAPI } from '../../utils/api';
import ScoringExplanation from '../../components/ScoringExplanation';
import PredictiveInsights from '../../components/PredictiveInsights';
import DashboardFilters from '../../components/DashboardFilters';
import { applyFilters, getDefaultFilters } from '../../utils/filterHelpers';

export default function RecruiterDashboard() {
  const { user, isRecruiter } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScoringExplanation, setShowScoringExplanation] = useState(false);
  const [filters, setFilters] = useState(getDefaultFilters());
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    if (isRecruiter) {
      fetchDashboardData();
    }
  }, [isRecruiter]);

  const fetchDashboardData = async () => {
    try {
      const [jobsResponse, applicationsResponse] = await Promise.all([
        jobsAPI.getMyJobs(),
        applicationsAPI.getAllForRecruiter(),
      ]);
      
      // Parse requirements to extract experienceRange for each job
      const jobsWithExperienceRange = jobsResponse.data.map(job => {
        let experienceRange = null;
        if (job.requirements) {
          try {
            const req = typeof job.requirements === 'string' 
              ? JSON.parse(job.requirements) 
              : job.requirements;
            if (req.experience) {
              experienceRange = { min: req.experience.min, max: req.experience.max };
            }
          } catch (e) {
            console.warn('Failed to parse requirements for job:', job.title);
          }
        }
        return { ...job, experienceRange };
      });
      
      setJobs(jobsWithExperienceRange);
      setApplications(applicationsResponse.data);
    } catch (error) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes with smooth transition
  const handleFilterChange = (newFilters) => {
    setIsFiltering(true);
    setFilters(newFilters);
    // Smooth transition effect
    setTimeout(() => setIsFiltering(false), 300);
  };

  // Apply filters to applications - memoized for performance
  const filteredApplications = useMemo(() => {
    return applyFilters(applications, filters);
  }, [applications, filters]);

  if (!isRecruiter) {
    return (
      <Layout>
        <div className="text-center text-red-600">
          Access denied. This page is for recruiters only.
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center">Loading dashboard...</div>
      </Layout>
    );
  }

  const getStatusColor = (status, testScore) => {
    // Check if test score actually exists (not null, undefined, 0, or empty string)
    const hasTestScore = testScore !== null && testScore !== undefined && testScore !== '' && testScore !== 0;
    
    if (status === 'test_completed' && hasTestScore) {
      return 'bg-blue-100 text-blue-800'; // Actually completed test
    }
    if (status === 'test_completed' && !hasTestScore) {
      return 'bg-green-100 text-green-800'; // Eligible but not taken test yet
    }
    
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800';
      case 'not_eligible': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, testScore) => {
    // Check if test score actually exists
    const hasTestScore = testScore !== null && testScore !== undefined && testScore !== '' && testScore !== 0;
    
    if (status === 'test_completed' && hasTestScore) {
      return 'Test Completed';
    }
    if (status === 'test_completed' && !hasTestScore) {
      return 'Eligible for Test';
    }
    
    switch (status) {
      case 'eligible': return 'Eligible for Test';
      case 'not_eligible': return 'Not Eligible';
      case 'test_completed': return 'Test Completed';
      default: return 'Pending';
    }
  };

  // Helper function to determine experience level from job title and experience range
  const determineExperienceLevel = (jobTitle, experienceRange) => {
    // First check title keywords (explicit override)
    const title = jobTitle.toLowerCase();
    if (title.includes('senior') || title.includes('sr.')) return 'senior';
    if (title.includes('lead') || title.includes('principal')) return 'lead';
    if (title.includes('junior') || title.includes('jr.')) return 'entry';
    
    // Use experience range average if available
    if (experienceRange && experienceRange.min !== undefined && experienceRange.max !== undefined) {
      const avgExp = (experienceRange.min + experienceRange.max) / 2;
      if (avgExp < 2.5) return 'entry';      // 0-2.4 years → Entry (70% resume, 30% test)
      if (avgExp < 4.5) return 'mid';        // 2.5-4.4 years → Mid (40% resume, 60% test)
      if (avgExp < 7) return 'senior';       // 4.5-6.9 years → Senior (30% resume, 70% test)
      return 'lead';                          // 7+ years → Lead (25% resume, 75% test)
    }
    
    // Fallback to mid if no experience range data
    return 'mid';
  };

  // Helper function to calculate weighted composite score
  const calculateWeightedScore = (aiScore, testScore, experienceLevel) => {
    const weightageConfig = {
      entry: { resume_weight: 70, test_weight: 30 },
      mid: { resume_weight: 40, test_weight: 60 },
      senior: { resume_weight: 30, test_weight: 70 },
      lead: { resume_weight: 25, test_weight: 75 }
    };
    
    const weights = weightageConfig[experienceLevel] || weightageConfig.mid;
    const weightedResumeScore = (aiScore * weights.resume_weight) / 100;
    const weightedTestScore = (testScore * weights.test_weight) / 100;
    const compositeFitScore = (weightedResumeScore + weightedTestScore).toFixed(1);
    
    return {
      composite_fit_score: compositeFitScore,
      experience_level: experienceLevel,
      weightage: weights,
      breakdown: {
        weighted_resume_score: weightedResumeScore.toFixed(1),
        weighted_test_score: weightedTestScore.toFixed(1)
      }
    };
  };

  // Calculate statistics from filtered data
  const totalApplications = filteredApplications.length;
  
  // NEW DEFINITION: Eligible = AI score >= job threshold AND test passed (score >= 70)
  const eligibleApplications = filteredApplications.filter(app => {
    // Must have completed test and passed it
    return app.status === 'test_completed' && app.test_score >= 70;
  }).length;
  
  // Removed: Complex trend calculations - simplified KPI cards
  
  const completedTests = filteredApplications.filter(app => app.status === 'test_completed').length;
  
  // For status distribution - actual statuses from data
  const testCompletedPassed = filteredApplications.filter(app => app.status === 'test_completed' && app.test_score >= 70).length;
  const testCompletedFailed = filteredApplications.filter(app => app.status === 'test_completed' && app.test_score < 70).length;
  const notEligible = filteredApplications.filter(app => app.status === 'not_eligible').length;
  
  const averageAIScore = filteredApplications.length > 0 
    ? Math.round(filteredApplications.reduce((sum, app) => sum + (app.ai_score || 0), 0) / filteredApplications.length)
    : 0;
  
  const averageTestScore = completedTests > 0
    ? Math.round(filteredApplications.filter(app => app.test_score).reduce((sum, app) => sum + (app.test_score || 0), 0) / completedTests)
    : 0;

  return (
    <Layout>
      <div>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
              <p className="text-gray-600 mt-2">View and analyze candidate applications with weighted scoring</p>
            </div>
            <button
              onClick={() => setShowScoringExplanation(true)}
              className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 text-sm"
            >
              📊 How Scoring Works
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Dashboard Filters */}
        <DashboardFilters 
          jobs={jobs}
          applications={applications}
          onFilterChange={handleFilterChange}
        />

        {/* Content with fade transition */}
        <div className={`transition-opacity duration-300 ${isFiltering ? 'opacity-50' : 'opacity-100'}`}>

        {/* KPI Cards - 6 Cards */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          {/* Total Jobs */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Total Jobs</h3>
              <span className="text-2xl">💼</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{jobs.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active postings</p>
          </div>
          
          {/* Total Applications */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Total Applications</h3>
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{totalApplications}</p>
            <p className="text-xs text-gray-500 mt-1">All submissions</p>
          </div>
          
          {/* Unique Candidates */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Unique Candidates</h3>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-cyan-600">
              {(() => {
                const uniqueEmails = new Set(filteredApplications.map(app => app.candidate_email));
                return uniqueEmails.size;
              })()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Distinct applicants</p>
          </div>
          
          {/* Passed Tests */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Passed Tests</h3>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{eligibleApplications}</p>
            <p className="text-xs text-gray-500 mt-1">Test ≥ 70%</p>
          </div>

          {/* Avg AI Score */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Avg AI Score</h3>
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-3xl font-bold text-indigo-600">
              {totalApplications > 0 
                ? Math.round(filteredApplications.reduce((sum, app) => sum + (app.ai_score || 0), 0) / filteredApplications.length)
                : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Resume match</p>
          </div>

          {/* Avg Test Score */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Avg Test Score</h3>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-3xl font-bold text-teal-600">
              {(() => {
                const testedApps = filteredApplications.filter(app => app.test_score !== null && app.test_score !== undefined && app.test_score > 0);
                return testedApps.length > 0 
                  ? Math.round(testedApps.reduce((sum, app) => sum + app.test_score, 0) / testedApps.length)
                  : 0;
              })()}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Assessment avg</p>
          </div>
        </div>

        {/* Application Status Distribution & AI Score Distribution - Side by Side */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Application Status Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Application Status Distribution</h2>
            <div className="space-y-3">
              {/* Test Passed */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Test Passed (≥70%)</span>
                  <span className="text-sm font-semibold text-green-600">
                    {eligibleApplications} ({totalApplications > 0 ? Math.round((eligibleApplications/totalApplications)*100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${totalApplications > 0 ? (eligibleApplications/totalApplications)*100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Test Failed */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Test Failed (&lt;70%)</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {(() => {
                      const failed = filteredApplications.filter(app => 
                        app.status === 'test_completed' && app.test_score !== null && app.test_score < 70
                      ).length;
                      return `${failed} (${totalApplications > 0 ? Math.round((failed/totalApplications)*100) : 0}%)`;
                    })()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(() => {
                        const failed = filteredApplications.filter(app => 
                          app.status === 'test_completed' && app.test_score !== null && app.test_score < 70
                        ).length;
                        return totalApplications > 0 ? (failed/totalApplications)*100 : 0;
                      })()}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Not Eligible */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Not Eligible (Low AI Score)</span>
                  <span className="text-sm font-semibold text-red-600">
                    {(() => {
                      const notEligible = filteredApplications.filter(app => app.status === 'not_eligible').length;
                      return `${notEligible} (${totalApplications > 0 ? Math.round((notEligible/totalApplications)*100) : 0}%)`;
                    })()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(() => {
                        const notEligible = filteredApplications.filter(app => app.status === 'not_eligible').length;
                        return totalApplications > 0 ? (notEligible/totalApplications)*100 : 0;
                      })()}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Score Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🎯 AI Score Distribution</h2>
            <div className="grid grid-cols-5 gap-2">
              {/* 90-100% */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredApplications.filter(app => app.ai_score >= 90).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  candidates ({filteredApplications.length > 0 ? Math.round((filteredApplications.filter(app => app.ai_score >= 90).length / filteredApplications.length) * 100) : 0}%)
                </div>
                <div className="text-xs font-medium text-green-700 mt-1">90-100%</div>
                <div className="text-xs text-gray-600">Excellent</div>
              </div>

              {/* 80-89% */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredApplications.filter(app => app.ai_score >= 80 && app.ai_score < 90).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  candidates ({filteredApplications.length > 0 ? Math.round((filteredApplications.filter(app => app.ai_score >= 80 && app.ai_score < 90).length / filteredApplications.length) * 100) : 0}%)
                </div>
                <div className="text-xs font-medium text-blue-700 mt-1">80-89%</div>
                <div className="text-xs text-gray-600">Good</div>
              </div>

              {/* 70-79% */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredApplications.filter(app => app.ai_score >= 70 && app.ai_score < 80).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  candidates ({filteredApplications.length > 0 ? Math.round((filteredApplications.filter(app => app.ai_score >= 70 && app.ai_score < 80).length / filteredApplications.length) * 100) : 0}%)
                </div>
                <div className="text-xs font-medium text-yellow-700 mt-1">70-79%</div>
                <div className="text-xs text-gray-600">Fair</div>
              </div>

              {/* 60-69% */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredApplications.filter(app => app.ai_score >= 60 && app.ai_score < 70).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  candidates ({filteredApplications.length > 0 ? Math.round((filteredApplications.filter(app => app.ai_score >= 60 && app.ai_score < 70).length / filteredApplications.length) * 100) : 0}%)
                </div>
                <div className="text-xs font-medium text-orange-700 mt-1">60-69%</div>
                <div className="text-xs text-gray-600">Below Avg</div>
              </div>

              {/* Below 60% */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {filteredApplications.filter(app => app.ai_score < 60).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  candidates ({filteredApplications.length > 0 ? Math.round((filteredApplications.filter(app => app.ai_score < 60).length / filteredApplications.length) * 100) : 0}%)
                </div>
                <div className="text-xs font-medium text-red-700 mt-1">&lt;60%</div>
                <div className="text-xs text-gray-600">Poor</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Candidates - With Composite Score */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">🌟 Top 5 Candidates</h2>
              <p className="text-xs text-gray-500 mt-1">Ranked by composite fit score (weighted by experience level)</p>
            </div>
            <button
              onClick={() => setShowScoringExplanation(true)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              How is this calculated?
            </button>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No candidates match the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications
                .filter(app => app.status === 'test_completed' && app.test_score)
                .map((application) => {
                  // Find the job to get experienceRange
                  const job = jobs.find(j => j.id === application.role_id);
                  const experienceLevel = determineExperienceLevel(application.job_title, job?.experienceRange);
                  const weightedScore = calculateWeightedScore(
                    application.ai_score, 
                    application.test_score || 0, 
                    experienceLevel
                  );
                  return { ...application, weightedScore };
                })
                .sort((a, b) => parseFloat(b.weightedScore.composite_fit_score) - parseFloat(a.weightedScore.composite_fit_score))
                .slice(0, 5)
                .map((application, index) => (
                  <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{application.candidate_name}</h3>
                        <p className="text-sm text-gray-600">{application.job_title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {application.weightedScore.experience_level} level • {application.weightedScore.weightage.resume_weight}% Resume + {application.weightedScore.weightage.test_weight}% Test
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{application.weightedScore.composite_fit_score}%</div>
                          <div className="text-xs text-gray-500">Composite</div>
                        </div>
                        <div className="border-l pl-3 space-y-1">
                          <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            AI: {application.ai_score}%
                          </div>
                          <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Test: {application.test_score}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/recruiter/applications/${application.id}`}
                      className="ml-4 bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                ))}
              {filteredApplications.filter(app => app.status === 'test_completed' && app.test_score).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No candidates have completed tests yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity - Compact Cards with Composite Score */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">📅 Recent Activity</h2>
            <div className="text-xs text-gray-500">
              Last 5 applications
            </div>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No candidates match the current filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {filteredApplications
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5)
                .map((application) => {
                  const timeAgo = (date) => {
                    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                    if (seconds < 0) return 'Just now'; // Handle future dates
                    if (seconds < 60) return 'Just now';
                    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
                    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
                    const days = Math.floor(seconds / 86400);
                    if (days === 1) return '1d ago';
                    if (days < 7) return `${days}d ago`;
                    return `${Math.floor(days / 7)}w ago`;
                  };

                  // Calculate composite score if test is completed
                  let compositeScore = null;
                  if (application.test_score) {
                    // Find the job to get experienceRange
                    const job = jobs.find(j => j.id === application.role_id);
                    const experienceLevel = determineExperienceLevel(application.job_title, job?.experienceRange);
                    const weightedScore = calculateWeightedScore(
                      application.ai_score,
                      application.test_score,
                      experienceLevel
                    );
                    compositeScore = weightedScore.composite_fit_score;
                  }

                  return (
                    <div key={application.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{application.candidate_name}</h4>
                        <p className="text-xs text-gray-600 truncate">{application.job_title}</p>
                      </div>
                      <div className="space-y-2 mb-3">
                        {compositeScore && (
                          <div className="flex items-center justify-between bg-purple-100 rounded px-2 py-1">
                            <span className="text-xs font-medium text-purple-700">Composite:</span>
                            <span className="text-xs font-bold text-purple-700">
                              {compositeScore}%
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">AI Score:</span>
                          <span className={`text-xs font-semibold ${
                            application.ai_score >= 80 ? 'text-green-600' : 
                            application.ai_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {application.ai_score}%
                          </span>
                        </div>
                        {application.test_score && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Test:</span>
                            <span className={`text-xs font-semibold ${
                              application.test_score >= 70 ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {application.test_score}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                        <span className="text-xs text-gray-500">{timeAgo(application.created_at)}</span>
                        <Link 
                          href={`/recruiter/applications/${application.id}`}
                          className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Skill Insights Section */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">🎯 Skill Insights</h2>
          <p className="text-sm text-gray-600">Understand skill strengths and gaps in your candidate pool</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Most In-Demand Skills */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-2">🎯 Most In-Demand Skills</h2>
            <p className="text-xs text-gray-600 mb-4">Top 5 skills candidates possess</p>

            <div className="space-y-3">
              {(() => {
                // Extract skills from applications
                const skillCounts = {};
                filteredApplications.forEach(app => {
                  if (app.skills_matched) {
                    try {
                      const skills = typeof app.skills_matched === 'string' ? JSON.parse(app.skills_matched) : app.skills_matched;
                      skills.forEach(skill => {
                        const skillName = typeof skill === 'string' ? skill : skill.skill || skill;
                        skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
                      });
                    } catch (e) {}
                  }
                });
                
                // Get top 5 skills
                const topSkills = Object.entries(skillCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([skill, count]) => ({
                    skill,
                    percentage: Math.round((count / filteredApplications.length) * 100),
                    count
                  }));
                
                if (topSkills.length === 0) {
                  return <p className="text-sm text-gray-500">No skill data available</p>;
                }
                
                return topSkills.map((item, index) => {
                  // Capitalize first letter of each word
                  const capitalizedSkill = item.skill.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-sm">{capitalizedSkill}</span>
                          <p className="text-xs text-gray-600">{item.count} candidates</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{item.percentage}%</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            <div className="mt-4 p-2 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-green-800">
                💡 Leverage these strengths in interviews
              </p>
            </div>
          </div>

          {/* Common Skill Gaps */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold">⚠️ Common Skill Gaps</h2>
              <div className="group relative">
                <span className="text-gray-400 hover:text-gray-600 cursor-help text-sm">ℹ️</span>
                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 z-50 shadow-xl">
                  <p className="font-semibold mb-2">Priority Levels:</p>
                  <p className="mb-1">🔴 <strong>High (&gt;30%):</strong> Critical shortage - many candidates missing this skill</p>
                  <p className="mb-1">🟠 <strong>Medium (15-30%):</strong> Moderate shortage - some candidates missing</p>
                  <p>🟡 <strong>Low (&lt;15%):</strong> Minor shortage - few candidates missing</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4">Top 5 skills candidates lack</p>

            <div className="space-y-3">
              {(() => {
                // Extract skill gaps from applications
                const gapCounts = {};
                filteredApplications.forEach(app => {
                  if (app.skill_gaps) {
                    try {
                      const gaps = typeof app.skill_gaps === 'string' ? JSON.parse(app.skill_gaps) : app.skill_gaps;
                      gaps.forEach(gap => {
                        const gapName = typeof gap === 'string' ? gap : gap.skill || gap;
                        gapCounts[gapName] = (gapCounts[gapName] || 0) + 1;
                      });
                    } catch (e) {}
                  }
                });
                
                // Get top 5 skill gaps
                const totalCandidates = filteredApplications.length;
                const topGaps = Object.entries(gapCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([skill, count]) => {
                    const percentage = Math.round((count / totalCandidates) * 100);
                    return {
                      skill,
                      count,
                      percentage,
                      priority: percentage > 30 ? 'High' : percentage > 15 ? 'Medium' : 'Low'
                    };
                  });
                
                if (topGaps.length === 0) {
                  return <p className="text-sm text-gray-500">No skill gap data available</p>;
                }
                
                return topGaps.map((item, index) => {
                  // Capitalize first letter of each word
                  const capitalizedSkill = item.skill.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-sm">{capitalizedSkill}</span>
                          <p className="text-xs text-gray-600">{item.count} missing ({item.percentage}%)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          item.percentage > 30 ? 'bg-red-100 text-red-700' :
                          item.percentage > 15 ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            <div className="mt-4 p-2 bg-orange-50 rounded border border-orange-200">
              <p className="text-xs text-orange-800">
                💡 Consider training or adjusting requirements
              </p>
            </div>
          </div>
        </div>

        {/* Removed: Recent Applications - redundant with Top Candidates */}



        {/* Removed: Top Candidates by Role - replaced with simplified Top 5 Candidates above */}

        {/* Job Performance Analytics - Moved to bottom */}
        {/* This section will be added here */}

        {/* Job Performance Analytics */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">📊 Job Performance Analytics</h2>
                <p className="text-sm text-gray-600">
                  Track completion rates, skill matches, and trends across all positions
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-800 font-medium">
                  ℹ️ Shows all-time data (Status & Date filters don't apply)
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto overflow-visible">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-3">Job Title</th>
                  <th className="text-left py-3 px-3">Applications</th>
                  <th className="text-left py-3 px-3 relative">
                    <div className="group inline-block">
                      <span className="cursor-help border-b border-dotted border-gray-400">Completion Rate ℹ️</span>
                      <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-4 shadow-2xl" style={{ zIndex: 9999 }}>
                        <p className="font-semibold mb-2 text-sm">📝 Completion Rate</p>
                        <p className="mb-2">Percentage of eligible candidates who completed the assessment test.</p>
                        <div className="bg-gray-800 rounded p-2 text-xs mt-2">
                          <p className="font-mono text-yellow-300">Formula: (Tested / Eligible) × 100</p>
                          <p className="mt-1 text-gray-300">Example: 60 tested out of 80 eligible = 75%</p>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-3 px-3 relative">
                    <div className="group inline-block">
                      <span className="cursor-help border-b border-dotted border-gray-400">Skill Match Rate ℹ️</span>
                      <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-4 shadow-2xl" style={{ zIndex: 9999 }}>
                        <p className="font-semibold mb-2 text-sm">🎯 Skill Match Rate</p>
                        <p className="mb-2">Average percentage of required skills that candidates possess. Shows candidate quality.</p>
                        <div className="bg-gray-800 rounded p-2 text-xs mt-2">
                          <p className="font-mono text-yellow-300">Formula: Average (Matched Skills / Required Skills) × 100</p>
                          <p className="mt-1 text-gray-300">Example: Job needs 10 skills, candidates match 7,8,6 = Avg 70%</p>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-3 px-3 relative">
                    <div className="group inline-block">
                      <span className="cursor-help border-b border-dotted border-gray-400">Trending ℹ️</span>
                      <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-4 shadow-2xl" style={{ zIndex: 9999 }}>
                        <p className="font-semibold mb-2 text-sm">📈 Trending</p>
                        <p className="mb-2">Shows if pass rate (≥70%) is improving. Compares recent vs older applications.</p>
                        <div className="bg-gray-800 rounded p-2 text-xs mt-2">
                          <p className="font-mono text-yellow-300">Formula: Recent pass rate - Older pass rate</p>
                          <p className="mt-1 text-gray-300">Sort by date, split in half, compare % who scored ≥70%</p>
                          <p className="mt-1 text-gray-300">Example: Recent 80% pass, Older 60% pass = +20% ↗</p>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs
                  .filter(job => filters.jobRole === 'all' || job.id === parseInt(filters.jobRole))
                  .map((job) => {
                  // Use ALL applications (unfiltered) for job performance metrics
                  const jobApplications = applications.filter(app => app.role_id === job.id);
                  
                  const totalCount = jobApplications.length;
                  
                  // Completion Rate: % who took test
                  const eligibleCount = jobApplications.filter(app => app.status !== 'not_eligible').length;
                  const testedCount = jobApplications.filter(app => app.test_score !== null && app.test_score !== undefined && app.test_score > 0).length;
                  const completionRate = eligibleCount > 0 ? Math.round((testedCount / eligibleCount) * 100) : 0;
                  
                  // Skill Match Rate: Average % of required skills that candidates possess
                  const jobSkillsCount = job.skills?.length || job.skillKeywords?.length || 10; // fallback to 10
                  
                  let totalSkillMatchPercentage = 0;
                  let candidatesWithSkillData = 0;
                  
                  jobApplications.forEach(app => {
                    try {
                      // Try to get matched skills from skills_matched field
                      let matchedSkills = [];
                      if (app.skills_matched) {
                        matchedSkills = typeof app.skills_matched === 'string' 
                          ? JSON.parse(app.skills_matched) 
                          : app.skills_matched;
                      }
                      
                      // If skills_matched is an array, count it
                      if (Array.isArray(matchedSkills) && matchedSkills.length > 0) {
                        const matchPercentage = (matchedSkills.length / jobSkillsCount) * 100;
                        totalSkillMatchPercentage += matchPercentage;
                        candidatesWithSkillData++;
                      }
                    } catch (e) {
                      // Skip if parsing fails
                    }
                  });
                  
                  const skillMatchRate = candidatesWithSkillData > 0 
                    ? Math.round(totalSkillMatchPercentage / candidatesWithSkillData)
                    : 0;
                  
                  // Trending: Split applications in half (recent vs older), compare pass rates
                  const sortedApps = [...jobApplications].sort((a, b) => 
                    new Date(b.created_at) - new Date(a.created_at)
                  );
                  
                  const halfPoint = Math.floor(sortedApps.length / 2);
                  const recentApps = sortedApps.slice(0, halfPoint);
                  const olderApps = sortedApps.slice(halfPoint);
                  
                  // Calculate pass rate (≥70%) for each half
                  const recentPassed = recentApps.filter(app => 
                    app.test_score !== null && app.test_score >= 70
                  ).length;
                  const recentPassRate = recentApps.length > 0 
                    ? (recentPassed / recentApps.length) * 100 
                    : 0;
                  
                  const olderPassed = olderApps.filter(app => 
                    app.test_score !== null && app.test_score >= 70
                  ).length;
                  const olderPassRate = olderApps.length > 0 
                    ? (olderPassed / olderApps.length) * 100 
                    : 0;
                  
                  const trendPercent = Math.round(recentPassRate - olderPassRate);
                  
                  return (
                    <tr key={job.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">
                        <Link 
                          href={`/recruiter/jobs/${job.id}/candidates`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {job.title}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-gray-900">{totalCount}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          completionRate >= 80 ? 'bg-green-100 text-green-800' : 
                          completionRate >= 60 ? 'bg-blue-100 text-blue-800' : 
                          completionRate >= 40 ? 'bg-yellow-100 text-yellow-800' : 
                          completionRate > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {completionRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          skillMatchRate >= 75 ? 'bg-green-100 text-green-800' : 
                          skillMatchRate >= 60 ? 'bg-blue-100 text-blue-800' : 
                          skillMatchRate >= 45 ? 'bg-yellow-100 text-yellow-800' : 
                          skillMatchRate > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {skillMatchRate > 0 ? `${skillMatchRate}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {sortedApps.length >= 2 ? (
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            trendPercent > 5 ? 'bg-green-100 text-green-800' : 
                            trendPercent < -5 ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {trendPercent > 0 ? '↗' : trendPercent < 0 ? '↘' : '→'} {Math.abs(trendPercent)}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Insufficient data</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/recruiter/jobs/${job.id}/candidates`}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 whitespace-nowrap"
                        >
                          View Candidates
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Color Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Color Coding Guide</h3>
            <div className="grid md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-semibold text-gray-700 mb-2">Completion Rate:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">80%+</span>
                    <span className="text-gray-600">Excellent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">60-79%</span>
                    <span className="text-gray-600">Good</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">40-59%</span>
                    <span className="text-gray-600">Fair</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">&lt;40%</span>
                    <span className="text-gray-600">Poor</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-2">Skill Match Rate:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">75%+</span>
                    <span className="text-gray-600">Excellent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">60-74%</span>
                    <span className="text-gray-600">Good</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">45-59%</span>
                    <span className="text-gray-600">Fair</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">&lt;45%</span>
                    <span className="text-gray-600">Poor</span>
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-2 italic">Based on matched skills from resume analysis</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-2">Trending:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">↗ +5%+</span>
                    <span className="text-gray-600">Improving</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">→ ±5%</span>
                    <span className="text-gray-600">Stable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">↘ -5%+</span>
                    <span className="text-gray-600">Declining</span>
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-2 italic">Compares pass rate (≥70%) between recent vs older half of applications</p>
              </div>
            </div>
          </div>
        </div>

        </div> {/* End transition wrapper */}

        <ScoringExplanation 
          show={showScoringExplanation}
          onClose={() => setShowScoringExplanation(false)}
        />
      </div>
    </Layout>
  );
}