import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { jobsAPI } from '../../utils/api';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const jobsPerPage = 9;

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobsAPI.getAll();
      setJobs(response.data);
    } catch (error) {
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Experience filter - using average of min/max for consistency with composite score logic
      let matchesExperience = true;
      if (experienceFilter !== 'all') {
        const minExp = job.experienceRange?.min || 0;
        const maxExp = job.experienceRange?.max || 0;
        const avgExp = (minExp + maxExp) / 2;
        
        if (experienceFilter === 'entry') {
          // Entry: 0-2.4 years average
          matchesExperience = avgExp < 2.5;
        } else if (experienceFilter === 'mid') {
          // Mid: 2.5-4.4 years average
          matchesExperience = avgExp >= 2.5 && avgExp < 4.5;
        } else if (experienceFilter === 'senior') {
          // Senior: 4.5+ years average
          matchesExperience = avgExp >= 4.5;
        }
      }
      
      return matchesSearch && matchesExperience;
    });
  }, [jobs, searchTerm, experienceFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // Get search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    return jobs
      .filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5) // Show max 5 suggestions
      .map(job => job.title);
  }, [jobs, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, experienceFilter]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading jobs...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Available Jobs</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Search with Autocomplete */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by job title or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
              
              {/* Autocomplete Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSearchTerm(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Experience Filter */}
            <div>
              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Experience Levels</option>
                <option value="entry">Entry Level (0-2.4 years avg)</option>
                <option value="mid">Mid Level (2.5-4.4 years avg)</option>
                <option value="senior">Senior Level (4.5+ years avg)</option>
              </select>
            </div>
          </div>
          
          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length} jobs
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            {searchTerm || experienceFilter !== 'all' 
              ? 'No jobs match your search criteria.' 
              : 'No jobs available at the moment.'}
          </div>
        ) : (
          <>
            {/* Grid Layout - 3 cards per row */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {currentJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow">
                  <div className="mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h2>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      Threshold: {job.threshold_score}%
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">
                    {job.description}
                  </p>
                  
                  {job.experienceRange && (
                    <p className="text-sm text-gray-500 mb-4">
                      📅 {job.experienceRange.min}-{job.experienceRange.max} years experience
                    </p>
                  )}
                  
                  <Link 
                    href={`/jobs/${job.id}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-center text-sm"
                  >
                    View Details & Apply
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mb-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Previous
                </button>
                
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-4 py-2 rounded ${
                      currentPage === index + 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}