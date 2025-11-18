/**
 * Filter Helper Functions
 * Applies filters to dashboard data
 */

/**
 * Apply all filters to applications array
 */
export function applyFilters(applications, filters) {
  let filtered = [...applications];

  // Filter by job role only
  if (filters.jobRole !== 'all') {
    filtered = filtered.filter(app => app.role_id === parseInt(filters.jobRole));
  }

  return filtered;
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters) {
  return filters.jobRole !== 'all';
}

/**
 * Get default filters
 */
export function getDefaultFilters() {
  return {
    jobRole: 'all',
    dateRange: 'all',
    status: 'all'
  };
}
