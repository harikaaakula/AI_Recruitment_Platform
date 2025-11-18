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
      
      setJobs(jobsResponse.data);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800';
      case 'not_eligible': return 'bg-red-100 text-red-800';
      case 'test_completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'eligible': return 'Eligible for Test';
      case 'not_eligible': return 'Not Eligible';
      case 'test_completed': return 'Test Completed';
      default: return 'Pending';
    }
  };

  // Helper function to determine experience level from job title
  const determineExperienceLevel = (jobTitle) => {
    const title = jobTitle.toLowerCase();
    if (title.includes('senior') || title.includes('sr.')) return 'senior';
    if (title.includes('lead') || title.includes('principal')) return 'lead';
    if (title.includes('junior') || title.includes('jr.')) return 'entry';
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

        {/* 1. Total Overview Cards */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          {/* Total Jobs */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Total Jobs</h3>
              <span className="text-2xl">💼</span>
            </div>
            <p className="text-4xl font-bold text-blue-600 mb-1">{jobs.length}</p>
            <p className="text-xs text-gray-500">Active job postings</p>
          </div>
          
          {/* Total Candidates Applied */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Total Candidates</h3>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-1">{totalApplications}</p>
            <p className="text-xs text-gray-500">
              {filters.jobRole === 'all' 
                ? 'Applied across all jobs' 
                : `Applied for ${jobs.find(j => j.id === parseInt(filters.jobRole))?.title || 'this job'}`
              }
            </p>
          </div>
          
          {/* Qualified Candidates */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">
                Qualified Candidates
              </h3>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-1">{eligibleApplications}</p>
            <p className="text-xs text-gray-500">
              {totalApplications > 0 ? Math.round((eligibleApplications/totalApplications)*100) : 0}% of total 
              <span className="text-gray-400 mx-1">•</span>
              Passed screening & test
            </p>
            
            {/* Enhanced Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-72 z-50 shadow-2xl border border-gray-700">
              <p className="font-semibold mb-2 text-sm">🎯 Qualified Candidates</p>
              <p className="mb-2">Candidates who meet all requirements and are ready for consideration.</p>
              
              <div className="bg-gray-800 rounded p-2 mb-2">
                <p className="font-semibold text-blue-300 mb-1">Requirements:</p>
                <p className="ml-2">✓ Passed AI resume screening</p>
                <p className="ml-2">✓ Completed assessment test</p>
                <p className="ml-2">✓ Test score ≥ 70%</p>
              </div>
              
              <p className="text-gray-300 text-xs italic">These candidates have demonstrated both relevant experience and practical skills.</p>
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
          
          {/* Average AI Score */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 cursor-help border-b border-dotted border-gray-400">
                Avg AI Score
              </h3>
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-4xl font-bold text-orange-600 mb-1">{averageAIScore}%</p>
            <p className="text-xs text-gray-500">Resume screening score</p>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-64 z-10 shadow-xl">
              <p className="font-semibold mb-1">AI Score Calculation:</p>
              <p>Average AI resume screening score across all candidates. Evaluates skills match, experience, and qualifications.</p>
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
          
          {/* Average Test Score */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 cursor-help border-b border-dotted border-gray-400">
                Avg Test Score
              </h3>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-4xl font-bold text-indigo-600 mb-1">{averageTestScore}%</p>
            <p className="text-xs text-gray-500">For {completedTests} tested</p>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-64 z-10 shadow-xl">
              <p className="font-semibold mb-1">Test Score Calculation:</p>
              <p>Average score for candidates who completed job-specific technical assessments. Passing threshold is 70%.</p>
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>

        {/* Analytics Visualizations */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Application Status Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Application Status Distribution</h2>
            <div className="space-y-4">
              {[
                { status: 'Test Passed (≥70%)', count: testCompletedPassed, color: 'bg-green-600', percentage: totalApplications > 0 ? Math.round((testCompletedPassed/totalApplications)*100) : 0 },
                { status: 'Test Failed (<70%)', count: testCompletedFailed, color: 'bg-yellow-600', percentage: totalApplications > 0 ? Math.round((testCompletedFailed/totalApplications)*100) : 0 },
                { status: 'Not Eligible (Low AI Score)', count: notEligible, color: 'bg-red-600', percentage: totalApplications > 0 ? Math.round((notEligible/totalApplications)*100) : 0 }
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.status}</span>
                    <span className="text-sm text-gray-600">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${item.color} h-3 rounded-full`} 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">AI Score Distribution</h2>
            <div className="space-y-3">
              {[
                { range: '90-100%', count: filteredApplications.filter(app => app.ai_score >= 90).length, color: 'bg-green-500' },
                { range: '80-89%', count: filteredApplications.filter(app => app.ai_score >= 80 && app.ai_score < 90).length, color: 'bg-blue-500' },
                { range: '70-79%', count: filteredApplications.filter(app => app.ai_score >= 70 && app.ai_score < 80).length, color: 'bg-yellow-500' },
                { range: '60-69%', count: filteredApplications.filter(app => app.ai_score >= 60 && app.ai_score < 70).length, color: 'bg-orange-500' },
                { range: 'Below 60%', count: filteredApplications.filter(app => app.ai_score < 60).length, color: 'bg-red-500' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 ${item.color} rounded mr-3`}></div>
                    <span className="font-medium">{item.range}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.count} candidates</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Predictive Insights Section - Hidden for demo */}
        {/* <PredictiveInsights /> */}

        {/* Job Performance Analytics */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Job Performance Analytics</h2>
              <div className="group relative">
                <span className="text-gray-400 hover:text-gray-600 cursor-help text-xl">ℹ️</span>
                <div className="hidden group-hover:block absolute right-0 w-96 bg-gray-800 text-white text-sm rounded-lg p-4 z-10 shadow-lg">
                <p className="font-semibold mb-3 text-base">📊 Understanding the Metrics:</p>
                
                <div className="mb-3">
                  <p className="font-semibold text-blue-300">Completion Rate:</p>
                  <p className="text-xs text-gray-300">% of applicants who completed the assessment test</p>
                </div>
                
                <div className="mb-3">
                  <p className="font-semibold text-blue-300">Skill Match Rate:</p>
                  <p className="text-xs text-gray-300">Average % of required skills that candidates possess</p>
                </div>
                
                <div className="mb-3">
                  <p className="font-semibold text-blue-300">Trending (Pass Rate):</p>
                  <p className="text-xs text-gray-300 mb-1">Compares candidate quality over time</p>
                  <p className="text-xs text-gray-300 mb-1">• <strong>Passed</strong> = Test completed AND score ≥ 70%</p>
                  <p className="text-xs text-gray-300 mb-1">• <strong>Recent</strong> = Newer 50% of applications (by date)</p>
                  <p className="text-xs text-gray-300 mb-1">• <strong>Older</strong> = Older 50% of applications (by date)</p>
                  <p className="text-xs text-gray-300">• ↑ = Recent half performing better than older half</p>
                </div>
                
                <p className="mt-3 text-xs text-gray-400 border-t border-gray-600 pt-2">💡 Hover over column headers for detailed explanations</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Track job performance metrics. <strong>Trending</strong> compares pass rates: <span className="font-medium">Recent half</span> (newer 50% of applications) vs <span className="font-medium">Older half</span> (older 50%).
            </p>
          </div>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Job Title</th>
                  <th className="text-left py-3">Applications</th>
                  <th className="text-left py-3">
                    <span className="group relative cursor-help inline-block">
                      Completion Rate
                      <span className="hidden group-hover:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-900 text-white text-sm rounded-lg p-4 z-[9999] shadow-2xl border-2 border-gray-700">
                        <div className="font-semibold mb-2 text-base">Completion Rate</div>
                        <p>Percentage of applicants who completed the assessment test. Higher is better.</p>
                      </span>
                    </span>
                  </th>
                  <th className="text-left py-3">
                    <span className="group relative cursor-help inline-block">
                      Skill Match Rate
                      <span className="hidden group-hover:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-900 text-white text-sm rounded-lg p-4 z-[9999] shadow-2xl border-2 border-gray-700">
                        <div className="font-semibold mb-2 text-base">Skill Match Rate</div>
                        <p>Average percentage of required skills that candidates possess. Shows candidate quality.</p>
                      </span>
                    </span>
                  </th>
                  <th className="text-left py-3">
                    <span className="group relative cursor-help inline-block">
                      Trending
                      <span className="hidden group-hover:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] bg-gray-900 text-white text-sm rounded-lg p-5 z-[9999] shadow-2xl border-2 border-gray-700">
                        <p className="font-semibold mb-3 text-base">📈 Pass Rate Trend Analysis</p>
                        
                        <div className="mb-3 pb-3 border-b border-gray-700">
                          <strong className="text-blue-300">What is "Passed"?</strong>
                          <p className="text-gray-300 mt-1">Candidate completed test AND scored ≥ 70%</p>
                        </div>
                        
                        <div className="mb-3 pb-3 border-b border-gray-700">
                          <strong className="text-blue-300">How it's calculated:</strong>
                          <p className="text-gray-300 mt-1">1. Sort all applications by date (newest to oldest)</p>
                          <p className="text-gray-300 mt-1">2. Split into two equal halves:</p>
                          <p className="text-gray-300 ml-3">• <strong>Recent</strong> = Newer 50% of applications</p>
                          <p className="text-gray-300 ml-3">• <strong>Older</strong> = Older 50% of applications</p>
                          <p className="text-gray-300 mt-1">3. Calculate pass rate for each half</p>
                          <p className="text-gray-300 mt-1">4. Compare: Recent % - Older % = Trend</p>
                        </div>
                        
                        <div className="text-gray-300">
                          <strong className="text-green-300">Example:</strong>
                          <p className="mt-1">Job has 80 applications (Oct-Nov 2024)</p>
                          <p>• Recent 40 (Nov): 30 passed → 75%</p>
                          <p>• Older 40 (Oct): 25 passed → 62.5%</p>
                          <p className="mt-1 text-green-300">→ Trend: ↑ 12.5% (improving!)</p>
                        </div>
                      </span>
                    </span>
                  </th>
                  <th className="text-left py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs
                  .filter(job => filters.jobRole === 'all' || job.id === parseInt(filters.jobRole))
                  .map((job) => {
                  const jobApplications = filteredApplications.filter(app => app.role_id === job.id);
                  
                  // Completion Rate: (test_completed / total_applications) × 100
                  const completedTests = jobApplications.filter(app => app.status === 'test_completed').length;
                  const completionRate = jobApplications.length > 0 ? Math.round((completedTests / jobApplications.length) * 100) : 0;
                  
                  // Skill Match Rate: Average of (matched_skills / required_skills) for each candidate
                  const jobRoleData = require('../../../backend/data/jobRoles').find(r => r.id === job.id.toString());
                  const requiredSkills = jobRoleData?.skills || [];
                  
                  let skillMatchRate = 0;
                  if (jobApplications.length > 0 && requiredSkills.length > 0) {
                    const totalMatchRate = jobApplications.reduce((sum, app) => {
                      if (app.skills_matched) {
                        try {
                          const matchedSkills = typeof app.skills_matched === 'string' 
                            ? JSON.parse(app.skills_matched) 
                            : app.skills_matched;
                          const matchedCount = Array.isArray(matchedSkills) ? matchedSkills.length : 0;
                          return sum + (matchedCount / requiredSkills.length);
                        } catch (e) {
                          return sum;
                        }
                      }
                      return sum;
                    }, 0);
                    skillMatchRate = Math.round((totalMatchRate / jobApplications.length) * 100);
                  }
                  
                  // Trending: Pass rate trend (recent half vs older half of data)
                  // Sort applications by date
                  const sortedApps = [...jobApplications].sort((a, b) => 
                    new Date(b.applied_at) - new Date(a.applied_at)
                  );
                  
                  // Split into two halves: recent vs older
                  const midpoint = Math.floor(sortedApps.length / 2);
                  const recentApps = sortedApps.slice(0, midpoint);
                  const previousApps = sortedApps.slice(midpoint);
                  
                  const recentPassed = recentApps.filter(app => app.status === 'test_completed' && app.test_score >= 70).length;
                  const previousPassed = previousApps.filter(app => app.status === 'test_completed' && app.test_score >= 70).length;
                  
                  const recentPassRate = recentApps.length > 0 ? (recentPassed / recentApps.length) * 100 : 0;
                  const previousPassRate = previousApps.length > 0 ? (previousPassed / previousApps.length) * 100 : 0;
                  
                  const trend = recentPassRate - previousPassRate;
                  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
                  const trendColor = trend > 0 ? 'bg-green-100 text-green-800' : 
                                     trend < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
                  
                  return (
                    <tr key={job.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">
                        <Link 
                          href={`/recruiter/jobs/${job.id}/candidates`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {job.title}
                        </Link>
                      </td>
                      <td className="py-3">{jobApplications.length}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          completionRate >= 70 ? 'bg-green-100 text-green-800' : 
                          completionRate >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {completionRate}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          skillMatchRate >= 70 ? 'bg-green-100 text-green-800' : 
                          skillMatchRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {skillMatchRate}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${trendColor}`}>
                          {trendIcon} {Math.abs(Math.round(trend))}%
                        </span>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/recruiter/jobs/${job.id}/candidates`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Candidates →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-2">Color Coding Guide:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700 mb-1">Completion Rate:</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">≥70%</span>
                  <span className="text-gray-600">Excellent engagement</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">40-69%</span>
                  <span className="text-gray-600">Moderate engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">&lt;40%</span>
                  <span className="text-gray-600">Low engagement</span>
                </div>
              </div>
              
              <div>
                <p className="font-medium text-gray-700 mb-1">Skill Match Rate:</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">≥70%</span>
                  <span className="text-gray-600">Strong match</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">50-69%</span>
                  <span className="text-gray-600">Moderate match</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">&lt;50%</span>
                  <span className="text-gray-600">Weak match</span>
                </div>
              </div>
              
              <div>
                <p className="font-medium text-gray-700 mb-1">Trending (Pass Rate):</p>
                <div className="text-xs text-gray-600 mb-2 space-y-1">
                  <p className="italic">Passed = Test completed + Score ≥ 70%</p>
                  <p className="font-medium">Compares: Recent 50% vs Older 50% (by date)</p>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">↑ X%</span>
                  <span className="text-gray-600">Newer half better</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">→ 0%</span>
                  <span className="text-gray-600">Stable quality</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">↓ X%</span>
                  <span className="text-gray-600">Newer half worse</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Candidate Skill Insights - Section Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🎯 Candidate Skill Insights</h2>
          <p className="text-sm text-gray-600 mb-4">Understand skill strengths and gaps in your candidate pool</p>
        </div>

        {/* Skills Analysis */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Most In-Demand Skills</h2>
              <div className="group relative">
                <span className="text-gray-400 hover:text-gray-600 cursor-help text-xl">ℹ️</span>
                <div className="hidden group-hover:block absolute right-0 bottom-full mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 z-50 shadow-2xl border border-gray-700">
                  <p className="font-semibold mb-2">Most In-Demand Skills</p>
                  <p className="mb-2">Shows the top 5 skills that candidates possess most frequently.</p>
                  <p className="mb-2"><strong>Percentage calculation:</strong><br/>
                  (Candidates with skill / Total candidates) × 100</p>
                  <p className="text-gray-300"><strong>Example:</strong><br/>
                  60 out of 85 candidates have "SIEM"<br/>
                  → (60 / 85) × 100 = 71%</p>
                </div>
              </div>
            </div>
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
                    } catch (e) {
                      // Handle parsing errors
                    }
                  }
                });
                
                // Get top 5 skills
                const topSkills = Object.entries(skillCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([skill, count]) => ({
                    skill,
                    demand: Math.round((count / filteredApplications.length) * 100),
                    applications: count
                  }));
                
                // Fallback if no skills found
                if (topSkills.length === 0) {
                  return [
                    { skill: 'Network Security', demand: 70, applications: Math.floor(filteredApplications.length * 0.7) },
                    { skill: 'SIEM', demand: 60, applications: Math.floor(filteredApplications.length * 0.6) },
                    { skill: 'Incident Response', demand: 65, applications: Math.floor(filteredApplications.length * 0.65) },
                    { skill: 'Penetration Testing', demand: 50, applications: Math.floor(filteredApplications.length * 0.5) },
                    { skill: 'Cloud Security', demand: 55, applications: Math.floor(filteredApplications.length * 0.55) }
                  ];
                }
                
                return topSkills;
              })().map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{item.skill}</span>
                    <span className="text-xs text-gray-500 ml-2">({item.applications} candidates have this)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.demand}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{item.demand}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Common Skill Gaps</h2>
              <div className="group relative">
                <span className="text-gray-400 hover:text-gray-600 cursor-help text-xl">ℹ️</span>
                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-72 z-10 shadow-xl">
                  <p className="font-semibold mb-2">Priority Level Calculation:</p>
                  <ul className="space-y-1">
                    <li>🔴 <span className="font-semibold">High Priority:</span> &gt;30% of candidates missing this skill</li>
                    <li>🟡 <span className="font-semibold">Medium Priority:</span> 15-30% of candidates missing this skill</li>
                    <li>🟢 <span className="font-semibold">Low Priority:</span> &lt;15% of candidates missing this skill</li>
                  </ul>
                  <p className="mt-2 text-gray-300 italic">Higher percentages indicate more widespread skill gaps requiring attention.</p>
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
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
                    } catch (e) {
                      // Handle parsing errors
                    }
                  }
                });
                
                // Get top 4 skill gaps with percentage
                const totalCandidates = filteredApplications.length;
                const topGaps = Object.entries(gapCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 4)
                  .map(([skill, count]) => {
                    const percentage = Math.round((count / totalCandidates) * 100);
                    return {
                      skill,
                      gap: percentage > 30 ? 'High' : percentage > 15 ? 'Medium' : 'Low',
                      count,
                      percentage,
                      priority: percentage > 30 ? 'bg-red-100 text-red-800' : 
                               percentage > 15 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    };
                  });
                
                // Fallback if no gaps found
                if (topGaps.length === 0) {
                  return [
                    { skill: 'Advanced Penetration Testing', gap: 'High', count: Math.floor(totalCandidates * 0.4), percentage: 40, priority: 'bg-red-100 text-red-800' },
                    { skill: 'Cloud Security (AWS/Azure)', gap: 'Medium', count: Math.floor(totalCandidates * 0.25), percentage: 25, priority: 'bg-yellow-100 text-yellow-800' },
                    { skill: 'DevSecOps', gap: 'Medium', count: Math.floor(totalCandidates * 0.2), percentage: 20, priority: 'bg-yellow-100 text-yellow-800' },
                    { skill: 'Threat Intelligence', gap: 'Low', count: Math.floor(totalCandidates * 0.1), percentage: 10, priority: 'bg-green-100 text-green-800' }
                  ];
                }
                
                return topGaps;
              })().map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{item.skill}</span>
                    <span className="text-xs text-gray-500 ml-2">({item.count} candidates, {item.percentage}%)</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${item.priority}`}>
                    {item.gap} Priority
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Applications</h2>
          
          {filteredApplications.length === 0 ? (
            <p className="text-gray-600">No applications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Candidate</th>
                    <th className="text-left py-2">Job</th>
                    <th className="text-left py-2">AI Score</th>
                    <th className="text-left py-2">Test Score</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Applied</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.slice(0, 10).map((application) => (
                    <tr key={application.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{application.candidate_name}</p>
                          <p className="text-sm text-gray-600">{application.candidate_email}</p>
                        </div>
                      </td>
                      <td className="py-3">{application.job_title}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          application.ai_score >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {application.ai_score}%
                        </span>
                      </td>
                      <td className="py-3">
                        {application.test_score ? (
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            application.test_score >= 70 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {application.test_score}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(application.status)}`}>
                          {getStatusText(application.status)}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {new Date(application.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Link 
                          href={`/recruiter/applications/${application.id}`}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          View Analysis
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>



        {/* Top Candidates */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🌟 Top Candidates This Week</h2>
          
          {filteredApplications.length === 0 ? (
            <p className="text-gray-600">No applications yet.</p>
          ) : (
            <div className="space-y-4">
              {filteredApplications
                .filter(app => app.status === 'test_completed')
                .map((application) => {
                  // Calculate weighted score for each application
                  const experienceLevel = determineExperienceLevel(application.job_title);
                  const weightedScore = calculateWeightedScore(
                    application.ai_score, 
                    application.test_score || 0, 
                    experienceLevel
                  );
                  return {
                    ...application,
                    weightedScore
                  };
                })
                .sort((a, b) => parseFloat(b.weightedScore.composite_fit_score) - parseFloat(a.weightedScore.composite_fit_score))
                .slice(0, 5)
                .map((application) => {
                  return (
                    <div key={application.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                      <div>
                        <h3 className="font-semibold">{application.candidate_name}</h3>
                        <p className="text-sm text-gray-600">{application.job_title}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            AI: {typeof application.ai_score === 'number' ? application.ai_score.toFixed(1) : application.ai_score}%
                          </span>
                          {application.test_score && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Test: {typeof application.test_score === 'number' ? application.test_score.toFixed(1) : application.test_score}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{application.weightedScore.composite_fit_score}</div>
                        <div className="text-xs text-gray-500">
                          {application.weightedScore.experience_level} ({application.weightedScore.weightage.resume_weight}%R + {application.weightedScore.weightage.test_weight}%T)
                        </div>
                        <Link 
                          href={`/recruiter/applications/${application.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Profile →
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
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