import { useState, useEffect } from 'react';

export default function DashboardFilters({ jobs, applications, onFilterChange }) {
  const [filters, setFilters] = useState({
    jobRole: 'all',
    dateRange: 'all',
    status: 'all'
  });

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('dashboardFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilters(parsed);
        onFilterChange(parsed);
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
  }, []);

  // Save filters to localStorage and notify parent
  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    localStorage.setItem('dashboardFilters', JSON.stringify(newFilters));
    onFilterChange(newFilters);
  };

  const handleJobChange = (e) => {
    updateFilters({ ...filters, jobRole: e.target.value });
  };

  const clearFilters = () => {
    const defaultFilters = { jobRole: 'all', dateRange: 'all', status: 'all' };
    updateFilters(defaultFilters);
  };

  const hasActiveFilters = filters.jobRole !== 'all';

  // Count applications per job
  const jobCounts = {};
  applications.forEach(app => {
    jobCounts[app.role_id] = (jobCounts[app.role_id] || 0) + 1;
  });

  // Get filtered count
  const getFilteredCount = () => {
    let filtered = applications;

    if (filters.jobRole !== 'all') {
      const roleId = parseInt(filters.jobRole);
      filtered = filtered.filter(app => app.role_id === roleId);
    }

    return filtered.length;
  };

  const filteredCount = getFilteredCount();
  const selectedJob = jobs.find(j => j.id === parseInt(filters.jobRole));

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🔍 Filter Dashboard</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="mb-4">
        {/* Job Role Filter */}
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Job Role
          </label>
          <select
            value={filters.jobRole}
            onChange={handleJobChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Jobs</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Summary - Only show when filtered */}
      {hasActiveFilters && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Viewing:</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                📌 {selectedJob?.title}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
