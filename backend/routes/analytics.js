/**
 * Analytics Routes - Predictive Insights API
 */

const express = require('express');
const router = express.Router();
const db = require('../database/init');
const jobRoles = require('../data/jobRoles');
const {
  parseSkills,
  getMonthKey,
  getSixMonthsAgo,
  get90DaysAgo,
  calculateGapRatio,
  categorizeQuality,
  linearRegression,
  predictValues
} = require('../services/analyticsService');

/**
 * GET /api/analytics/skill-gap-trends
 * Returns top 5 skills with largest shortage, monthly trends, 3-month forecast
 */
router.get('/skill-gap-trends', (req, res) => {
  const sixMonthsAgo = getSixMonthsAgo().toISOString();
  
  // Get all applications from last 6 months with AI analysis
  const query = `
    SELECT 
      a.applied_at,
      ai.skills_matched
    FROM applications a
    JOIN ai_analysis ai ON a.application_id = ai.application_id
    WHERE a.applied_at >= ?
    ORDER BY a.applied_at ASC
  `;
  
  db.all(query, [sixMonthsAgo], (err, applications) => {
    if (err) {
      console.error('Error fetching skill gap data:', err);
      return res.status(500).json({ error: 'Failed to fetch skill gap trends' });
    }
    
    try {
      // Calculate demand for each skill (from job roles)
      const skillDemand = {};
      jobRoles.forEach(role => {
        role.skills.forEach(skill => {
          skillDemand[skill] = (skillDemand[skill] || 0) + 1;
        });
      });
      
      // Group applications by month and count skill supply
      const monthlySkillSupply = {};
      
      applications.forEach(app => {
        const monthKey = getMonthKey(app.applied_at);
        if (!monthlySkillSupply[monthKey]) {
          monthlySkillSupply[monthKey] = {};
        }
        
        const skills = parseSkills(app.skills_matched);
        skills.forEach(skill => {
          monthlySkillSupply[monthKey][skill] = (monthlySkillSupply[monthKey][skill] || 0) + 1;
        });
      });
      
      // Calculate gap ratio for each skill per month
      const skillGapTrends = {};
      const months = Object.keys(monthlySkillSupply).sort();
      
      Object.keys(skillDemand).forEach(skill => {
        skillGapTrends[skill] = months.map((month, index) => {
          const supply = monthlySkillSupply[month][skill] || 0;
          const demand = skillDemand[skill];
          const gapRatio = calculateGapRatio(demand, supply);
          
          return {
            month,
            monthIndex: index,
            demand,
            supply,
            gapRatio
          };
        });
      });
      
      // Find top 5 skills with largest average gap
      const skillAverageGaps = Object.keys(skillGapTrends).map(skill => {
        const avgGap = skillGapTrends[skill].reduce((sum, m) => sum + m.gapRatio, 0) / skillGapTrends[skill].length;
        return { skill, avgGap };
      });
      
      const top5Skills = skillAverageGaps
        .sort((a, b) => b.avgGap - a.avgGap)
        .slice(0, 5)
        .map(s => s.skill);
      
      // Prepare data for charting with forecast
      const chartData = months.map((month, index) => {
        const dataPoint = { month, monthIndex: index };
        top5Skills.forEach(skill => {
          const monthData = skillGapTrends[skill].find(m => m.month === month);
          dataPoint[skill] = monthData ? monthData.gapRatio : 0;
        });
        return dataPoint;
      });
      
      // Generate 3-month forecast for each skill
      const forecasts = {};
      top5Skills.forEach(skill => {
        const historicalData = skillGapTrends[skill].map(m => [m.monthIndex, m.gapRatio]);
        const predictions = predictValues(historicalData, 3);
        
        forecasts[skill] = predictions.map(([monthIndex, gapRatio]) => {
          const forecastDate = new Date(months[months.length - 1]);
          forecastDate.setMonth(forecastDate.getMonth() + (monthIndex - months.length + 1));
          return {
            month: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`,
            monthIndex,
            gapRatio: Math.round(gapRatio * 10) / 10,
            isForecast: true
          };
        });
      });
      
      // Add forecast to chart data
      top5Skills.forEach(skill => {
        forecasts[skill].forEach(forecast => {
          let existingPoint = chartData.find(d => d.month === forecast.month);
          if (!existingPoint) {
            existingPoint = { month: forecast.month, monthIndex: forecast.monthIndex, isForecast: true };
            chartData.push(existingPoint);
          }
          existingPoint[`${skill}_forecast`] = forecast.gapRatio;
        });
      });
      
      res.json({
        skills: top5Skills,
        data: chartData.sort((a, b) => a.monthIndex - b.monthIndex),
        metadata: {
          description: 'Top 5 skills with largest shortage',
          calculation: 'Gap Ratio = Demand (jobs requiring skill) / Supply (candidates with skill)',
          forecastPeriod: '3 months'
        }
      });
      
    } catch (error) {
      console.error('Error processing skill gap trends:', error);
      res.status(500).json({ error: 'Failed to process skill gap trends' });
    }
  });
});

/**
 * GET /api/analytics/quality-distribution
 * Returns candidate quality distribution (Excellent/Good/Poor) with 30-day forecast
 */
router.get('/quality-distribution', (req, res) => {
  const sixMonthsAgo = getSixMonthsAgo().toISOString();
  
  const query = `
    SELECT 
      a.applied_at,
      ai.ai_score,
      t.test_score
    FROM applications a
    JOIN ai_analysis ai ON a.application_id = ai.application_id
    LEFT JOIN tests t ON a.application_id = t.application_id
    WHERE a.applied_at >= ?
    ORDER BY a.applied_at ASC
  `;
  
  db.all(query, [sixMonthsAgo], (err, applications) => {
    if (err) {
      console.error('Error fetching quality distribution:', err);
      return res.status(500).json({ error: 'Failed to fetch quality distribution' });
    }
    
    try {
      // Group by month and categorize
      const monthlyQuality = {};
      
      applications.forEach(app => {
        const monthKey = getMonthKey(app.applied_at);
        if (!monthlyQuality[monthKey]) {
          monthlyQuality[monthKey] = { excellent: 0, good: 0, poor: 0, total: 0 };
        }
        
        const quality = categorizeQuality(app.ai_score, app.test_score);
        monthlyQuality[monthKey][quality]++;
        monthlyQuality[monthKey].total++;
      });
      
      // Prepare chart data
      const months = Object.keys(monthlyQuality).sort();
      const chartData = months.map((month, index) => ({
        month,
        monthIndex: index,
        excellent: monthlyQuality[month].excellent,
        good: monthlyQuality[month].good,
        poor: monthlyQuality[month].poor,
        total: monthlyQuality[month].total
      }));
      
      // Calculate current distribution percentages
      const totalRecent = chartData.slice(-3).reduce((sum, m) => sum + m.total, 0);
      const recentExcellent = chartData.slice(-3).reduce((sum, m) => sum + m.excellent, 0);
      const recentGood = chartData.slice(-3).reduce((sum, m) => sum + m.good, 0);
      const recentPoor = chartData.slice(-3).reduce((sum, m) => sum + m.poor, 0);
      
      const excellentRatio = recentExcellent / totalRecent;
      const goodRatio = recentGood / totalRecent;
      const poorRatio = recentPoor / totalRecent;
      
      // Forecast total applications for next month using linear regression
      const historicalTotals = chartData.map((m, i) => [i, m.total]);
      const totalForecast = predictValues(historicalTotals, 1);
      const predictedTotal = totalForecast[0][1];
      
      // Apply current ratios to predicted total
      const forecastDate = new Date(months[months.length - 1]);
      forecastDate.setMonth(forecastDate.getMonth() + 1);
      const forecastMonth = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      
      chartData.push({
        month: forecastMonth,
        monthIndex: chartData.length,
        excellent: Math.round(predictedTotal * excellentRatio),
        good: Math.round(predictedTotal * goodRatio),
        poor: Math.round(predictedTotal * poorRatio),
        total: predictedTotal,
        isForecast: true
      });
      
      res.json({
        data: chartData,
        currentDistribution: {
          excellent: Math.round(excellentRatio * 100),
          good: Math.round(goodRatio * 100),
          poor: Math.round(poorRatio * 100)
        },
        metadata: {
          description: 'Candidate quality distribution over time',
          categories: {
            excellent: 'AI Score ≥ 80 OR Test Score ≥ 80',
            good: 'Scores between 60-79',
            poor: 'Scores below 60'
          },
          forecastPeriod: '1 month'
        }
      });
      
    } catch (error) {
      console.error('Error processing quality distribution:', error);
      res.status(500).json({ error: 'Failed to process quality distribution' });
    }
  });
});

/**
 * GET /api/analytics/application-forecast
 * Returns last 90 days actual + next 30 days forecast
 */
router.get('/application-forecast', (req, res) => {
  const ninetyDaysAgo = get90DaysAgo().toISOString();
  
  const query = `
    SELECT 
      DATE(applied_at) as date,
      COUNT(*) as count
    FROM applications
    WHERE applied_at >= ?
    GROUP BY DATE(applied_at)
    ORDER BY date ASC
  `;
  
  db.all(query, [ninetyDaysAgo], (err, dailyData) => {
    if (err) {
      console.error('Error fetching application forecast:', err);
      return res.status(500).json({ error: 'Failed to fetch application forecast' });
    }
    
    try {
      // Prepare historical data
      const chartData = dailyData.map((day, index) => ({
        date: day.date,
        dayIndex: index,
        count: day.count,
        isForecast: false
      }));
      
      // Generate 30-day forecast
      const historicalData = dailyData.map((day, index) => [index, day.count]);
      const predictions = predictValues(historicalData, 30);
      
      predictions.forEach(([dayIndex, count]) => {
        const forecastDate = new Date(dailyData[dailyData.length - 1].date);
        forecastDate.setDate(forecastDate.getDate() + (dayIndex - dailyData.length + 1));
        
        chartData.push({
          date: forecastDate.toISOString().split('T')[0],
          dayIndex,
          count,
          isForecast: true
        });
      });
      
      res.json({
        data: chartData,
        metadata: {
          description: 'Total application volume forecast',
          historicalDays: 90,
          forecastDays: 30
        }
      });
      
    } catch (error) {
      console.error('Error processing application forecast:', error);
      res.status(500).json({ error: 'Failed to process application forecast' });
    }
  });
});

/**
 * GET /api/analytics/skill-demand
 * Returns top 10 emerging skills (increasing in candidate resumes)
 */
router.get('/skill-demand', (req, res) => {
  const sixMonthsAgo = getSixMonthsAgo().toISOString();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const query = `
    SELECT 
      a.applied_at,
      ai.skills_matched
    FROM applications a
    JOIN ai_analysis ai ON a.application_id = ai.application_id
    WHERE a.applied_at >= ?
    ORDER BY a.applied_at ASC
  `;
  
  db.all(query, [sixMonthsAgo], (err, applications) => {
    if (err) {
      console.error('Error fetching skill demand:', err);
      return res.status(500).json({ error: 'Failed to fetch skill demand' });
    }
    
    try {
      // Split into two periods: previous 3 months vs recent 3 months
      const previousPeriod = {};
      const recentPeriod = {};
      
      applications.forEach(app => {
        const appDate = new Date(app.applied_at);
        const skills = parseSkills(app.skills_matched);
        const targetPeriod = appDate >= threeMonthsAgo ? recentPeriod : previousPeriod;
        
        skills.forEach(skill => {
          targetPeriod[skill] = (targetPeriod[skill] || 0) + 1;
        });
      });
      
      // Calculate growth for each skill
      const skillGrowth = [];
      const allSkills = new Set([...Object.keys(previousPeriod), ...Object.keys(recentPeriod)]);
      
      allSkills.forEach(skill => {
        const previousCount = previousPeriod[skill] || 0;
        const recentCount = recentPeriod[skill] || 0;
        
        // Only consider skills that appear in recent period
        if (recentCount > 0) {
          const growthRate = previousCount > 0 
            ? ((recentCount - previousCount) / previousCount) * 100 
            : 100; // New skill = 100% growth
          
          skillGrowth.push({
            skill,
            previousCount,
            recentCount,
            growthRate: Math.round(growthRate),
            trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable'
          });
        }
      });
      
      // Get top 10 by growth rate
      const top10 = skillGrowth
        .sort((a, b) => b.growthRate - a.growthRate)
        .slice(0, 10);
      
      res.json({
        skills: top10,
        metadata: {
          description: 'Emerging skills based on candidate resume trends',
          calculation: 'Compares skill frequency in last 3 months vs previous 3 months',
          period: 'Last 6 months'
        }
      });
      
    } catch (error) {
      console.error('Error processing skill demand:', error);
      res.status(500).json({ error: 'Failed to process skill demand' });
    }
  });
});

module.exports = router;
