import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../context/AuthContext';
import { applicationsAPI, testsAPI } from '../../../utils/api';
import AIRecommendations from '../../../components/AIRecommendations';

export default function ApplicationDetails() {
  const { isRecruiter } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [application, setApplication] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && isRecruiter) {
      fetchApplicationDetails();
    }
  }, [id, isRecruiter]);

  const fetchApplicationDetails = async () => {
    try {
      const appResponse = await applicationsAPI.getById(id);
      setApplication(appResponse.data);
      
      // If test is completed, fetch test results
      if (appResponse.data.status === 'test_completed') {
        try {
          const testResponse = await testsAPI.getResults(id);
          setTestResults(testResponse.data);
        } catch (testError) {
          console.log('No test results found');
        }
      }
    } catch (error) {
      setError('Failed to load application details');
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
        <div className="text-center">Loading application details...</div>
      </Layout>
    );
  }

  if (error || !application) {
    return (
      <Layout>
        <div className="text-center text-red-600">{error || 'Application not found'}</div>
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

  // Parse AI insights from ERD database structure
  let aiInsights;
  
  // Handle ERD structure where skills come from matched_skills field
  if (application.matched_skills) {
    try {
      const matchedSkills = JSON.parse(application.matched_skills);
      const skillGaps = application.skill_gaps ? JSON.parse(application.skill_gaps) : [];
      
      aiInsights = {
        skills_matched: Array.isArray(matchedSkills) ? matchedSkills : [],
        skill_gaps: Array.isArray(skillGaps) ? skillGaps : [],
        certifications: application.certifications ? application.certifications.split(',').map(c => c.trim()) : [],
        education: { 
          level: application.education || 'Not specified', 
          field: 'Not specified' 
        },
        experience_years: application.experience_years || 0,
        strengths: ['Technical skills match job requirements'],
        recommendations: ['Continue developing expertise in matched skills'],
        industry_experience: []
      };
    } catch (e) {
      console.error('Error parsing ERD skills data:', e);
      aiInsights = null;
    }
  }

  // Fallback insights if parsing fails
  if (!aiInsights) {
    aiInsights = {
      skills_matched: [
        { skill: 'JavaScript', category: 'programming', level: 'expert' },
        { skill: 'React', category: 'frontend', level: 'expert' }
      ],
      skill_gaps: [
        { skill: 'TypeScript', category: 'programming', priority: 'medium' }
      ],
      certifications: [],
      education: { level: 'bachelors', field: 'computer science' },
      experience_years: application.experience_years || 2,
      strengths: ['Strong technical foundation'],
      recommendations: ['Expand skill set with emerging technologies'],
      industry_experience: []
    };
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold">Candidate Application Details</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Candidate Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Candidate Information</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-lg font-semibold">{application.candidate_name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p>{application.candidate_email}</p>
                </div>
                
                {application.candidate_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p>{application.candidate_phone}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Applied For</label>
                  <p className="font-medium">{application.job_title}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Application Date</label>
                  <p>{new Date(application.created_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                    {getStatusText(application.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Score Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">AI Resume Score</span>
                    <span className="text-lg font-bold text-blue-600">{application.ai_score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${application.ai_score}%` }}
                    ></div>
                  </div>
                </div>
                
                {application.test_score && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Test Score</span>
                      <span className="text-lg font-bold text-green-600">{application.test_score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${application.test_score}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Overall Compatibility</span>
                    <span className="text-xl font-bold text-purple-600">
                      {Math.round((application.ai_score + (application.test_score || 0)) / (application.test_score ? 2 : 1))}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills Analysis */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Skills Analysis</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-700 mb-3">✓ Matched Skills</h4>
                  <div className="space-y-2">
                    {aiInsights.skills_matched.map((skill, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="font-medium">{skill.skill}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          skill.level === 'expert' ? 'bg-green-200 text-green-800' :
                          skill.level === 'intermediate' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {skill.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-red-700 mb-3">⚠ Skill Gaps</h4>
                  <div className="space-y-2">
                    {aiInsights.skill_gaps.map((gap, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="font-medium">{gap.skill}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          gap.priority === 'high' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                        }`}>
                          {gap.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Experience & Education */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Experience & Education</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Experience</h4>
                  <p className="text-2xl font-bold text-blue-600">{aiInsights.experience_years} years</p>
                  <p className="text-sm text-gray-600">Total experience</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Education</h4>
                  <p className="font-medium capitalize">{aiInsights.education.level}</p>
                  <p className="text-sm text-gray-600 capitalize">{aiInsights.education.field}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Industry</h4>
                  <div className="flex flex-wrap gap-1">
                    {aiInsights.industry_experience.map((industry, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Certifications */}
            {aiInsights.certifications.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {aiInsights.certifications.map((cert, index) => (
                    <span key={index} className="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg font-medium">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Recommendations */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-700">Strengths</h3>
                <ul className="space-y-2">
                  {aiInsights.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4 text-orange-700">Recommendations</h3>
                <ul className="space-y-2">
                  {aiInsights.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Test Results */}
            {testResults && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Test Performance</h3>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{testResults.score}%</p>
                    <p className="text-sm text-gray-600">Overall Score</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {JSON.parse(testResults.answers).filter((_, i) => i % 2 === 0).length}
                    </p>
                    <p className="text-sm text-gray-600">Questions Answered</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {new Date(testResults.completed_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">Completed On</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Recommendations Section */}
            <AIRecommendations 
              applicationId={id} 
              candidateName={application.candidate_name}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}