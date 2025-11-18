/**
 * Analytics Service - Predictive Insights & Forecasting
 * Provides calculations for skill gaps, quality distribution, and forecasting
 */

/**
 * Simple Linear Regression
 * Returns slope and intercept for trend line
 */
function linearRegression(data) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  
  const sumX = data.reduce((acc, [x]) => acc + x, 0);
  const sumY = data.reduce((acc, [, y]) => acc + y, 0);
  const sumXY = data.reduce((acc, [x, y]) => acc + x * y, 0);
  const sumX2 = data.reduce((acc, [x]) => acc + x * x, 0);
  
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return { slope: 0, intercept: sumY / n };
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

/**
 * Predict future values using linear regression
 */
function predictValues(historicalData, periodsAhead) {
  const { slope, intercept } = linearRegression(historicalData);
  const lastX = historicalData.length > 0 ? historicalData[historicalData.length - 1][0] : 0;
  
  const predictions = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const x = lastX + i;
    const y = Math.max(0, slope * x + intercept); // Don't predict negative values
    predictions.push([x, Math.round(y)]);
  }
  
  return predictions;
}

/**
 * Parse skills from comma-separated string
 */
function parseSkills(skillsString) {
  if (!skillsString) return [];
  return skillsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Get month key from date string
 */
function getMonthKey(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get date 6 months ago
 */
function getSixMonthsAgo() {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return date;
}

/**
 * Get date 90 days ago
 */
function get90DaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date;
}

/**
 * Group data by month
 */
function groupByMonth(data, dateField, valueField) {
  const grouped = {};
  
  data.forEach(item => {
    const monthKey = getMonthKey(item[dateField]);
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(item[valueField]);
  });
  
  return grouped;
}

/**
 * Calculate skill gap ratio (Demand / Supply)
 * Capped at 99 to avoid infinity
 */
function calculateGapRatio(demand, supply) {
  if (supply === 0) return 99;
  return Math.min(99, demand / supply);
}

/**
 * Categorize candidate quality based on scores
 */
function categorizeQuality(aiScore, testScore) {
  const hasTest = testScore !== null && testScore !== undefined;
  const maxScore = hasTest ? Math.max(aiScore, testScore) : aiScore;
  
  if (maxScore >= 80) return 'excellent';
  if (maxScore >= 60) return 'good';
  return 'poor';
}

module.exports = {
  linearRegression,
  predictValues,
  parseSkills,
  getMonthKey,
  getSixMonthsAgo,
  get90DaysAgo,
  groupByMonth,
  calculateGapRatio,
  categorizeQuality
};
