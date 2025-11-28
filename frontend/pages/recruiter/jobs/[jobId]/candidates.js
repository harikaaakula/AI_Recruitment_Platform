import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { jobsAPI, applicationsAPI } from '../../../../utils/api';
import JobCandidateFilters from '../../../../components/JobCandidateFilters';
import { applyJobFilters, getDefaultJobFilters } from '../../../../utils/filterHelpers';
import ScoringExplanation from '../../../../components/ScoringExplanation';

export default function JobCandidates() {
  const { isRecruiter } = useAuth();
  const router = useRouter();
  const { jobId } = router.query;
  
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'ai_score', 'test_score', 'date'
  const [filters, setFilters] = useState(getDefaultJobFilters());
  const [showScoringExplanation, setShowScoringExplanation] = useState(false);

  useEffect(() => {
    if (jobId && isRecruiter) {
      fetchJobAndCandidates();
    }
  }, [jobId, isRecruiter]);

  const fetchJobAndCandidates = async () => {
    try {
      const [jobResponse, candidatesResponse] = await Promise.all([
        jobsAPI.getById(jobId),
        applicationsAPI.getByJobId(jobId)
      ]);
      
      setJob(jobResponse.data);
      setCandidates(candidatesResponse.data);
    } catch (error) {
      setError('Failed to load job candidates');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters first, then sort (must be before early returns)
  const filteredCandidates = useMemo(() => {
    return applyJobFilters(candidates, filters);
  }, [candidates, filters]);

  // Helper functions for composite score calculation
  const determineExperienceLevelForSort = (jobTitle, experienceRange) => {
    const title = jobTitle.toLowerCase();
    if (title.includes('senior') || title.includes('sr.')) return 'senior';
    if (title.includes('lead') || title.includes('principal')) return 'lead';
    if (title.includes('junior') || title.includes('jr.')) return 'entry';
    
    if (experienceRange && experienceRange.min !== undefined && experienceRange.max !== undefined) {
      const avgExp = (experienceRange.min + experienceRange.max) / 2;
      if (avgExp < 2.5) return 'entry';
      if (avgExp < 4.5) return 'mid';
      if (avgExp < 7) return 'senior';
      return 'lead';
    }
    
    return 'mid';
  };

  const calculateCompositeScore = (aiScore, testScore, experienceLevel) => {
    const weightageConfig = {
      entry: { resume_weight: 70, test_weight: 30 },
      mid: { resume_weight: 40, test_weight: 60 },
      senior: { resume_weight: 30, test_weight: 70 },
      lead: { resume_weight: 25, test_weight: 75 }
    };
    
    const weights = weightageConfig[experienceLevel] || weightageConfig.mid;
    const weightedResumeScore = (aiScore * weights.resume_weight) / 100;
    const weightedTestScore = (testScore * weights.test_weight) / 100;
    return parseFloat((weightedResumeScore + weightedTestScore).toFixed(1));
  };

  // Sort filtered candidates based on selected option
  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      switch (sortBy) {
        case 'composite_score':
          // Calculate composite scores for sorting
          if (a.test_score && b.test_score) {
            const expLevelA = determineExperienceLevelForSort(job?.title || '', job?.experienceRange);
            const expLevelB = determineExperienceLevelForSort(job?.title || '', job?.experienceRange);
            const compositeA = calculateCompositeScore(a.ai_score || 0, a.test_score || 0, expLevelA);
            const compositeB = calculateCompositeScore(b.ai_score || 0, b.test_score || 0, expLevelB);
            return compositeB - compositeA;
          }
          // If no test scores, fall back to AI score
          return (b.ai_score || 0) - (a.ai_score || 0);
        case 'ai_score':
          return (b.ai_score || 0) - (a.ai_score || 0);
        case 'test_score':
          return (b.test_score || 0) - (a.test_score || 0);
        case 'date':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [filteredCandidates, sortBy, job]);

  // Calculate statistics - Hiring Readiness Metrics (using filtered candidates)
  const totalCandidates = filteredCandidates.length;
  const totalAllCandidates = candidates.length;
  
  const interviewReady = filteredCandidates.filter(c => 
    c.status === 'test_completed' && c.test_score >= 70
  ).length;
  
  const highPerformers = filteredCandidates.filter(c => 
    c.status === 'test_completed' && c.test_score >= 80
  ).length;
  
  const awaitingTests = filteredCandidates.filter(c => {
    const hasTestScore = c.test_score !== null && c.test_score !== undefined && c.test_score !== '' && c.test_score !== 0;
    return c.status === 'eligible' || (c.status === 'test_completed' && !hasTestScore);
  }).length;

  const jobRoleData = job ? {
    skills: job.skills || [],
    certifications: job.certifications || []
  } : null;

  // Helper functions
  const getStatusColor = (status, testScore) => {
    // Check if test score exists (including 0 as a valid score)
    const hasTestScore = testScore !== null && testScore !== undefined && testScore !== '';
    
    if (status === 'test_completed' && hasTestScore) {
      return 'bg-blue-100 text-blue-800';
    }
    if (status === 'test_completed' && !hasTestScore) {
      return 'bg-green-100 text-green-800';
    }
    
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800';
      case 'not_eligible': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, testScore) => {
    // Check if test score exists (including 0 as a valid score)
    const hasTestScore = testScore !== null && testScore !== undefined && testScore !== '';
    
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
      case 'hired': return 'Hired';
      case 'rejected': return 'Rejected';
      case 'under_review': return 'Under Review';
      case 'shortlisted': return 'Shortlisted';
      case 'test_assigned': return 'Test Assigned';
      case 'test_in_progress': return 'Taking Test';
      case 'interviewed': return 'Interviewed';
      default: return 'Pending';
    }
  };

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
        <div className="text-center">Loading job candidates...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center text-red-600">{error}</div>
      </Layout>
    );
  }



  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/recruiter/dashboard" className="text-blue-600 hover:text-blue-800">
                  Dashboard
                </Link>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <span className="text-gray-500">Jobs</span>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <span className="text-gray-900 font-medium">{job?.title}</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Job Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div>
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{job?.title}</h1>
              <button
                onClick={() => setShowScoringExplanation(true)}
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 text-sm whitespace-nowrap"
              >
                📊 How Scoring Works
              </button>
            </div>
            
            <div className="mb-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                AI Score Threshold: {job?.threshold_score}%
              </span>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Job Description</h3>
              <p className="text-gray-600 leading-relaxed">{job?.description}</p>
            </div>
            
            {job?.mainResponsibilities && job.mainResponsibilities.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Main Responsibilities</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  {job.mainResponsibilities.map((responsibility, index) => (
                    <li key={index} className="leading-relaxed">{responsibility}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Preferred Qualifications</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                {job?.education && <li className="leading-relaxed">{job.education}</li>}
                {job?.preferredExperience && job.preferredExperience.map((exp, index) => (
                  <li key={index} className="leading-relaxed">{exp}</li>
                ))}
                {job?.certifications && job.certifications.length > 0 && (
                  <li className="leading-relaxed">
                    Certifications: {job.certifications.join(', ')}
                  </li>
                )}
              </ul>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 pt-4 border-t">
              <span>💰 ${job?.salary_min?.toLocaleString()} - ${job?.salary_max?.toLocaleString()}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                job?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {job?.status}
              </span>
            </div>
          </div>
        </div>

        {/* Job Candidate Filters */}
        <JobCandidateFilters 
          jobId={jobId}
          jobRole={jobRoleData}
          candidates={candidates}
          onFilterChange={setFilters}
        />

        {/* Results Counter */}
        {totalCandidates !== totalAllCandidates && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Showing <span className="font-semibold">{totalCandidates}</span> of <span className="font-semibold">{totalAllCandidates}</span> candidates
              {totalCandidates === 0 && (
                <span className="ml-2 text-blue-600">
                  - No candidates match your filters. Try adjusting your criteria.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Hiring Readiness Metrics - Streamlined */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800">🎯 Hiring Readiness</h2>
          <p className="text-sm text-gray-600">Key metrics for this position</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Total Applicants */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Total Applicants</h3>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-4xl font-bold text-blue-600 mb-1">{totalCandidates}</p>
            <p className="text-xs text-gray-500">Applied for this position</p>
          </div>
          
          {/* Ready to Interview (merged Interview Ready + High Performers) */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Ready to Interview</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-1">{interviewReady}</p>
            <p className="text-xs text-gray-500">
              {totalCandidates > 0 ? Math.round((interviewReady/totalCandidates)*100) : 0}% passed test (≥70%)
              {highPerformers > 0 && (
                <span className="text-purple-600 font-semibold ml-1">• {highPerformers} top performers (≥80%)</span>
              )}
            </p>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-72 z-50 shadow-2xl border border-gray-700">
              <p className="font-semibold mb-2 text-sm">✅ Ready to Interview</p>
              <p className="mb-2">Candidates who passed both screening stages:</p>
              <div className="bg-gray-800 rounded p-2 mb-2">
                <p className="ml-2">✓ Passed AI resume screening</p>
                <p className="ml-2">✓ Completed assessment test</p>
                <p className="ml-2">✓ Test score ≥ 70%</p>
              </div>
              <p className="text-purple-300 text-xs mb-2">
                <strong>Top Performers (≥80%):</strong> {highPerformers} candidates - Priority for interviews
              </p>
              <p className="text-gray-300 text-xs italic">These candidates are qualified and ready to schedule interviews.</p>
            </div>
          </div>
          
          {/* Awaiting Tests */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Awaiting Tests</h3>
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-4xl font-bold text-orange-600 mb-1">{awaitingTests}</p>
            <p className="text-xs text-gray-500">
              {awaitingTests > 0 
                ? 'Eligible but not tested yet'
                : 'All eligible candidates tested'
              }
            </p>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-72 z-50 shadow-2xl border border-gray-700">
              <p className="font-semibold mb-2 text-sm">⏳ Awaiting Tests</p>
              <p className="mb-2">Candidates who passed AI screening but haven't taken the assessment yet.</p>
              <div className="bg-gray-800 rounded p-2 mb-2">
                <p className="text-gray-300">• <strong>Action needed:</strong> Send test reminders</p>
                <p className="text-gray-300">• May need follow-up communication</p>
                <p className="text-gray-300">• Potential qualified candidates</p>
              </div>
              <p className="text-gray-300 text-xs italic">Reach out to these candidates to complete their assessment.</p>
            </div>
          </div>
        </div>

        {/* Analytics Grid - Quality Distribution, Skill Gaps, Top Candidates */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          
          {/* 1. Quality Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6 group relative">
            <h2 className="text-xl font-semibold mb-4">📊 Quality Distribution</h2>
            <p className="text-xs text-gray-500 mb-3">All-time candidate quality (filters don't apply)</p>
            
            {/* Tooltip */}
            <div className="absolute top-0 right-0 mt-2 mr-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-72 z-50 shadow-2xl border border-gray-700">
              <p className="font-semibold mb-2 text-sm">📊 Quality Distribution</p>
              <p className="mb-2">Shows AI resume screening scores for ALL candidates who applied to this position.</p>
              <div className="bg-gray-800 rounded p-2 mb-2 space-y-1">
                <p className="text-green-300">• <strong>Excellent (80-100%):</strong> Strong resume match</p>
                <p className="text-blue-300">• <strong>Good (60-79%):</strong> Moderate resume match</p>
                <p className="text-red-300">• <strong>Below Threshold (&lt;60%):</strong> Weak resume match</p>
              </div>
              <p className="text-gray-300 text-xs italic">Note: Shows all-time data, not affected by filters.</p>
            </div>
            
            <div className="space-y-3">
              {/* Excellent (80-100%) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Excellent (80-100%)</span>
                  <span className="text-sm font-semibold text-green-600">
                    {candidates.filter(c => c.ai_score >= 80).length} ({candidates.length > 0 ? Math.round((candidates.filter(c => c.ai_score >= 80).length / candidates.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${candidates.length > 0 ? (candidates.filter(c => c.ai_score >= 80).length / candidates.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Good (60-79%) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Good (60-79%)</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {candidates.filter(c => c.ai_score >= 60 && c.ai_score < 80).length} ({candidates.length > 0 ? Math.round((candidates.filter(c => c.ai_score >= 60 && c.ai_score < 80).length / candidates.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${candidates.length > 0 ? (candidates.filter(c => c.ai_score >= 60 && c.ai_score < 80).length / candidates.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Below Threshold (<60%) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Below Threshold (&lt;60%)</span>
                  <span className="text-sm font-semibold text-red-600">
                    {candidates.filter(c => c.ai_score < 60).length} ({candidates.length > 0 ? Math.round((candidates.filter(c => c.ai_score < 60).length / candidates.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${candidates.length > 0 ? (candidates.filter(c => c.ai_score < 60).length / candidates.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Skill Match Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Skill Gaps</h2>
            <p className="text-xs text-gray-500 mb-3">Top 3 skills candidates lack (filters don't apply)</p>
            {(() => {
              // Extract skill gaps from ALL candidates (same logic as main dashboard)
              const gapCounts = {};
              candidates.forEach(candidate => {
                if (candidate.skill_gaps) {
                  try {
                    const gaps = typeof candidate.skill_gaps === 'string' 
                      ? JSON.parse(candidate.skill_gaps) 
                      : candidate.skill_gaps;
                    gaps.forEach(gap => {
                      const gapName = typeof gap === 'string' ? gap : gap.skill || gap;
                      gapCounts[gapName] = (gapCounts[gapName] || 0) + 1;
                    });
                  } catch (e) {
                    // Skip invalid data
                  }
                }
              });
              
              // Get top 3 skill gaps
              const totalCandidates = candidates.length;
              const topGaps = Object.entries(gapCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([skill, count]) => ({
                  skill,
                  count,
                  percentage: Math.round((count / totalCandidates) * 100)
                }));

              if (topGaps.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No skill gap data</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {topGaps.map((gap, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{gap.skill}</span>
                        <span className="text-sm font-semibold text-red-600">
                          {gap.count} missing ({gap.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-red-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${gap.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* 3. Top 3 Candidates - With Composite Score */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">🏆 Top 3 Candidates</h2>
              <p className="text-xs text-gray-500 mt-1">Ranked by composite fit score</p>
            </div>
            {(() => {
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
                  weightage: weights
                };
              };

              const topCandidates = filteredCandidates
                .filter(c => c.test_score !== null && c.test_score !== undefined && c.test_score > 0)
                .map(candidate => {
                  const experienceLevel = determineExperienceLevel(job?.title || '', job?.experienceRange);
                  const weightedScore = calculateWeightedScore(
                    candidate.ai_score,
                    candidate.test_score,
                    experienceLevel
                  );
                  return { ...candidate, weightedScore };
                })
                .sort((a, b) => parseFloat(b.weightedScore.composite_fit_score) - parseFloat(a.weightedScore.composite_fit_score))
                .slice(0, 3);

              if (topCandidates.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No tests completed</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {topCandidates.map((candidate, index) => (
                    <div key={candidate.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Rank Badge */}
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        
                        {/* Candidate Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{candidate.candidate_name}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>{candidate.weightedScore.experience_level} level</span>
                            <span>•</span>
                            <span>{candidate.weightedScore.weightage.resume_weight}% Resume + {candidate.weightedScore.weightage.test_weight}% Test</span>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <Link 
                          href={`/recruiter/applications/${candidate.id}`}
                          className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 flex-shrink-0"
                        >
                          View
                        </Link>
                      </div>
                      
                      {/* Scores Row */}
                      <div className="flex items-center gap-2 ml-11">
                        <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                          Composite: {candidate.weightedScore.composite_fit_score}%
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                          AI: {candidate.ai_score}%
                        </div>
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                          Test: {candidate.test_score}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

        </div>

        {/* Sort Options */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-700">Candidates</h3>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="date">Date Applied (Newest First)</option>
                <option value="composite_score">Composite Score (Highest First)</option>
                <option value="ai_score">AI Score (Highest First)</option>
                <option value="test_score">Test Score (Highest First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">All Candidates</h2>
            <span className="text-sm text-gray-600">
              {totalCandidates} {totalCandidates !== totalAllCandidates ? `of ${totalAllCandidates}` : 'total'} candidates
            </span>
          </div>
          
          {sortedCandidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No candidates have applied yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3">Candidate</th>
                    <th className="text-left py-3">Composite Score</th>
                    <th className="text-left py-3">AI Score</th>
                    <th className="text-left py-3">Test Score</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-left py-3">Applied</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCandidates.map((candidate) => (
                    <React.Fragment key={candidate.id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                            {candidate.candidate_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{candidate.candidate_name}</p>
                            <p className="text-sm text-gray-600">{candidate.candidate_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        {candidate.test_score !== null && candidate.test_score !== undefined && candidate.test_score !== '' ? (
                          (() => {
                            const expLevel = determineExperienceLevelForSort(job?.title || '', job?.experienceRange);
                            const compositeScore = calculateCompositeScore(candidate.ai_score || 0, candidate.test_score || 0, expLevel);
                            return (
                              <div className="text-center">
                                <span className={`px-3 py-2 rounded-lg text-lg font-bold ${
                                  compositeScore >= 80 ? 'bg-purple-100 text-purple-700' : 
                                  compositeScore >= 70 ? 'bg-blue-100 text-blue-700' : 
                                  compositeScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {compositeScore}%
                                </span>
                                <p className="text-xs text-gray-500 mt-1">{expLevel} level</p>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400 text-sm">Test pending</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 relative">
                            <svg className="w-12 h-12 transform -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="#e5e7eb"
                                strokeWidth="4"
                                fill="none"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke={candidate.ai_score >= 70 ? '#10b981' : candidate.ai_score >= 50 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${(candidate.ai_score / 100) * 125.6} 125.6`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-semibold">{candidate.ai_score}%</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        {candidate.test_score ? (
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            candidate.test_score >= 70 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {candidate.test_score}%
                          </span>
                        ) : (
                          <span className="text-gray-400">Not taken</span>
                        )}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(candidate.status, candidate.test_score)}`}>
                          {getStatusText(candidate.status, candidate.test_score)}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-gray-600">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setExpandedCandidate(expandedCandidate === candidate.id ? null : candidate.id)}
                            className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                          >
                            {expandedCandidate === candidate.id ? 'Hide' : 'Details'}
                          </button>
                          <Link 
                            href={`/recruiter/applications/${candidate.id}`}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            Profile
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row - Skill Performance */}
                    {expandedCandidate === candidate.id && (
                      <tr>
                        <td colSpan="6" className="bg-gray-50 p-6">
                          {candidate.verification_details ? (
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* Skills Passed */}
                              <div className="bg-white p-4 rounded-lg shadow">
                                <h4 className="font-semibold text-green-700 mb-3 flex items-center">
                                  <span className="mr-2">✅</span> Skills Passed
                                </h4>
                                <div className="space-y-2">
                                  {(() => {
                                    try {
                                      const details = typeof candidate.verification_details === 'string' 
                                        ? JSON.parse(candidate.verification_details) 
                                        : candidate.verification_details;
                                      const passedSkills = Object.entries(details).filter(([_, data]) => 
                                        data.percentage >= 50 || data.level === 'strong'
                                      );
                                      
                                      if (passedSkills.length === 0) {
                                        return <p className="text-sm text-gray-500">No skills passed</p>;
                                      }
                                      
                                      return passedSkills.map(([skill], idx) => (
                                        <div key={idx} className="flex items-center text-sm">
                                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                          <span>{skill}</span>
                                        </div>
                                      ));
                                    } catch (e) {
                                      return <p className="text-sm text-gray-500">No test taken yet</p>;
                                    }
                                  })()}
                                </div>
                              </div>

                              {/* Skills Failed */}
                              <div className="bg-white p-4 rounded-lg shadow">
                                <h4 className="font-semibold text-red-700 mb-3 flex items-center">
                                  <span className="mr-2">❌</span> Skills Failed
                                </h4>
                                <div className="space-y-2">
                                  {(() => {
                                    try {
                                      const details = typeof candidate.verification_details === 'string' 
                                        ? JSON.parse(candidate.verification_details) 
                                        : candidate.verification_details;
                                      const failedSkills = Object.entries(details).filter(([_, data]) => 
                                        data.percentage < 50 || data.level === 'weak'
                                      );
                                      
                                      if (failedSkills.length === 0) {
                                        return <p className="text-sm text-gray-500">No skills failed</p>;
                                      }
                                      
                                      return failedSkills.map(([skill], idx) => (
                                        <div key={idx} className="flex items-center text-sm">
                                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                          <span>{skill}</span>
                                        </div>
                                      ));
                                    } catch (e) {
                                      return <p className="text-sm text-gray-500">No test taken yet</p>;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p>No test taken yet</p>
                              <p className="text-sm mt-2">Skill performance will be displayed after the candidate completes the assessment.</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ScoringExplanation 
          show={showScoringExplanation}
          onClose={() => setShowScoringExplanation(false)}
        />

      </div>
    </Layout>
  );
}