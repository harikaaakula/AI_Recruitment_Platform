import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { jobsAPI, applicationsAPI } from '../../../../utils/api';

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800';
      case 'not_eligible': return 'bg-red-100 text-red-800';
      case 'test_completed': return 'bg-blue-100 text-blue-800';
      case 'hired': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'eligible': return 'Eligible';
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

  // Sort candidates based on selected option
  const sortedCandidates = [...candidates].sort((a, b) => {
    switch (sortBy) {
      case 'ai_score':
        return (b.ai_score || 0) - (a.ai_score || 0);
      case 'test_score':
        return (b.test_score || 0) - (a.test_score || 0);
      case 'date':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // Calculate statistics
  const totalCandidates = candidates.length;
  const eligibleCandidates = candidates.filter(c => c.status === 'eligible' || c.status === 'test_completed').length;
  const completedTests = candidates.filter(c => c.status === 'test_completed').length;
  const avgAIScore = candidates.length > 0 
    ? Math.round(candidates.reduce((sum, c) => sum + (c.ai_score || 0), 0) / candidates.length)
    : 0;

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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{job?.title}</h1>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Job Description</h3>
              <p className="text-gray-600 leading-relaxed">{job?.description}</p>
            </div>
            
            {job?.requirements && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Requirements</h3>
                <p className="text-gray-600 leading-relaxed">{job?.requirements}</p>
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 pt-4 border-t">
              <span>💰 ${job?.salary_min?.toLocaleString()} - ${job?.salary_max?.toLocaleString()}</span>
              <span>📅 Posted {new Date(job?.created_at).toLocaleDateString()}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                job?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {job?.status}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Applicants</h3>
            <p className="text-3xl font-bold text-blue-600">{totalCandidates}</p>
            <p className="text-sm text-gray-600">For this position</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Screening Passed</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{eligibleCandidates}</p>
            <p className="text-sm text-gray-600">
              {totalCandidates > 0 ? Math.round((eligibleCandidates/totalCandidates)*100) : 0}% passed AI screening
            </p>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-72 z-50 shadow-2xl border border-gray-700">
              <p className="font-semibold mb-2">✅ Screening Passed</p>
              <p className="mb-2">Candidates whose resumes passed the AI screening process.</p>
              <p className="text-gray-300">These candidates met the minimum requirements and are eligible to take the assessment test.</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Tests Completed</h3>
            <p className="text-3xl font-bold text-purple-600">{completedTests}</p>
            <p className="text-sm text-gray-600">{totalCandidates > 0 ? Math.round((completedTests/totalCandidates)*100) : 0}% completion</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg AI Score</h3>
            <p className="text-3xl font-bold text-orange-600">{avgAIScore}%</p>
            <p className="text-sm text-gray-600">Compatibility rating</p>
          </div>
        </div>

        {/* Job-Specific Insights */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Candidate Quality Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6 group relative">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold cursor-help border-b border-dotted border-gray-400">📊 Quality Distribution</h3>
            </div>
            
            {/* Tooltip */}
            <div className="absolute top-0 right-0 mt-2 mr-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-3 px-4 w-72 z-10 shadow-xl">
              <p className="font-semibold mb-2">How Quality is Calculated:</p>
              <p className="mb-2">Based on AI Resume Screening Score which evaluates:</p>
              <ul className="list-disc list-inside space-y-1 mb-2">
                <li>Skills match with job requirements</li>
                <li>Experience level alignment</li>
                <li>Education and certifications</li>
                <li>Overall profile compatibility</li>
              </ul>
              <p className="text-xs text-gray-300 mt-2">
                <strong>Excellent (80-100%):</strong> Strong match, highly recommended<br/>
                <strong>Good (60-79%):</strong> Decent match, worth considering<br/>
                <strong>Below Threshold (&lt;60%):</strong> Weak match, not recommended
              </p>
            </div>
            
            <div className="space-y-3">
              {(() => {
                const excellent = candidates.filter(c => c.ai_score >= 80).length;
                const good = candidates.filter(c => c.ai_score >= 60 && c.ai_score < 80).length;
                const poor = candidates.filter(c => c.ai_score < 60).length;
                const total = candidates.length || 1;
                
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm">Excellent (80-100%)</span>
                      </div>
                      <span className="font-semibold">{excellent} ({Math.round((excellent/total)*100)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(excellent/total)*100}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-sm">Good (60-79%)</span>
                      </div>
                      <span className="font-semibold">{good} ({Math.round((good/total)*100)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(good/total)*100}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm">Below Threshold (&lt;60%)</span>
                      </div>
                      <span className="font-semibold">{poor} ({Math.round((poor/total)*100)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(poor/total)*100}%` }}></div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Skill Match Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">🎯 Skill Match Analysis</h3>
            <div className="space-y-3">
              {(() => {
                // Analyze most common skill gaps
                const gapCounts = {};
                candidates.forEach(c => {
                  if (c.skill_gaps) {
                    try {
                      const gaps = typeof c.skill_gaps === 'string' ? JSON.parse(c.skill_gaps) : c.skill_gaps;
                      gaps.forEach(gap => {
                        const gapName = typeof gap === 'string' ? gap : gap.skill || gap;
                        gapCounts[gapName] = (gapCounts[gapName] || 0) + 1;
                      });
                    } catch (e) {}
                  }
                });
                
                const topGaps = Object.entries(gapCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3);
                
                if (topGaps.length === 0) {
                  return <p className="text-sm text-gray-500">No significant skill gaps detected</p>;
                }
                
                return topGaps.map(([skill, count], idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium">{skill}</span>
                    <span className="text-xs text-orange-700">
                      {count} candidates missing ({Math.round((count/candidates.length)*100)}%)
                    </span>
                  </div>
                ));
              })()}
              <p className="text-xs text-gray-500 mt-3">
                💡 Consider: Adjust requirements or provide training for these skills
              </p>
            </div>
          </div>

          {/* Top 3 Candidates */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">⭐ Top 3 Candidates</h3>
            <div className="space-y-3">
              {(() => {
                const topCandidates = [...candidates]
                  .filter(c => c.test_score) // Only candidates who completed tests
                  .sort((a, b) => {
                    const scoreA = (a.ai_score + (a.test_score || 0)) / 2;
                    const scoreB = (b.ai_score + (b.test_score || 0)) / 2;
                    return scoreB - scoreA;
                  })
                  .slice(0, 3);
                
                if (topCandidates.length === 0) {
                  return <p className="text-sm text-gray-500">No candidates have completed tests yet</p>;
                }
                
                return topCandidates.map((candidate, idx) => {
                  const avgScore = Math.round((candidate.ai_score + (candidate.test_score || 0)) / 2);
                  return (
                    <div key={candidate.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm">{candidate.candidate_name}</p>
                          <p className="text-xs text-gray-600">{candidate.candidate_email}</p>
                        </div>
                        <span className="text-lg font-bold text-purple-600">{avgScore}%</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">AI: {candidate.ai_score}%</span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Test: {candidate.test_score}%</span>
                      </div>
                      <Link 
                        href={`/recruiter/applications/${candidate.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                      >
                        View Full Profile →
                      </Link>
                    </div>
                  );
                });
              })()}
            </div>
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
              {totalCandidates} total candidates
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
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(candidate.status)}`}>
                          {getStatusText(candidate.status)}
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
                    {/* Expanded Row - Skill Verification */}
                    {expandedCandidate === candidate.id && (
                      <tr>
                        <td colSpan="6" className="bg-gray-50 p-6">
                          <div className="grid md:grid-cols-3 gap-6">
                            {/* Verified Skills */}
                            <div className="bg-white p-4 rounded-lg shadow">
                              <h4 className="font-semibold text-green-700 mb-3 flex items-center">
                                <span className="mr-2">✅</span> Verified Skills
                              </h4>
                              {candidate.verified_skills ? (
                                <div className="space-y-2">
                                  {JSON.parse(candidate.verified_skills).map((skill, idx) => (
                                    <div key={idx} className="flex items-center text-sm">
                                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                      <span>{skill}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No test taken yet</p>
                              )}
                            </div>

                            {/* Unverified Skills */}
                            <div className="bg-white p-4 rounded-lg shadow">
                              <h4 className="font-semibold text-red-700 mb-3 flex items-center">
                                <span className="mr-2">❌</span> Skills Claimed but Not Demonstrated
                              </h4>
                              {candidate.unverified_skills ? (
                                <div className="space-y-2">
                                  {JSON.parse(candidate.unverified_skills).map((skill, idx) => (
                                    <div key={idx} className="flex items-center text-sm">
                                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                      <span>{skill}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No unverified skills</p>
                              )}
                            </div>

                            {/* Untested Skills */}
                            <div className="bg-white p-4 rounded-lg shadow">
                              <h4 className="font-semibold text-yellow-700 mb-3 flex items-center">
                                <span className="mr-2">⚠️</span> Skills Not Covered by Test
                              </h4>
                              {candidate.untested_skills ? (
                                <div className="space-y-2">
                                  {JSON.parse(candidate.untested_skills).map((skill, idx) => (
                                    <div key={idx} className="flex items-center text-sm">
                                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                                      <span>{skill}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">All skills tested</p>
                              )}
                            </div>
                          </div>
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


      </div>
    </Layout>
  );
}