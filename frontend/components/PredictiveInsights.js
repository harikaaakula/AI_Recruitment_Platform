import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export default function PredictiveInsights() {
  const [skillGapData, setSkillGapData] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [skillDemandData, setSkillDemandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [skillGap, quality, forecast, skillDemand] = await Promise.all([
        axios.get(`${API_BASE_URL}/analytics/skill-gap-trends`, config),
        axios.get(`${API_BASE_URL}/analytics/quality-distribution`, config),
        axios.get(`${API_BASE_URL}/analytics/application-forecast`, config),
        axios.get(`${API_BASE_URL}/analytics/skill-demand`, config)
      ]);

      setSkillGapData(skillGap.data);
      setQualityData(quality.data);
      setForecastData(forecast.data);
      setSkillDemandData(skillDemand.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load predictive insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Predictive Insights</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Predictive Insights</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!skillGapData || !qualityData || !forecastData || !skillDemandData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">📊 Predictive Insights</h2>
        <div className="text-gray-500 text-center py-8">
          No data available for analysis
        </div>
      </div>
    );
  }

  const colors = {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6">📊 Predictive Insights</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Skill Gap Trends */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Skill Gap Trends</h3>
            <div className="group relative">
              <span className="text-gray-400 cursor-help">ℹ️</span>
              <div className="hidden group-hover:block absolute right-0 w-64 bg-gray-800 text-white text-sm rounded p-2 z-10">
                {skillGapData.metadata.description}. Higher ratio = bigger shortage.
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={skillGapData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: 'Gap Ratio', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {skillGapData.skills.map((skill, index) => (
                <Line
                  key={skill}
                  type="monotone"
                  dataKey={skill}
                  stroke={Object.values(colors)[index % 6]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-2">
            Top 5 skills with largest shortage. Forecast: next 3 months
          </p>
        </div>

        {/* Candidate Quality Distribution */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Candidate Quality Distribution</h3>
            <div className="group relative">
              <span className="text-gray-400 cursor-help">ℹ️</span>
              <div className="hidden group-hover:block absolute right-0 w-64 bg-gray-800 text-white text-sm rounded p-2 z-10">
                {qualityData.metadata.description}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={qualityData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="excellent"
                stackId="1"
                stroke={colors.success}
                fill={colors.success}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="good"
                stackId="1"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="poor"
                stackId="1"
                stroke={colors.danger}
                fill={colors.danger}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-2">
            Excellent (≥80) | Good (60-79) | Poor (&lt;60). Last point is forecast.
          </p>
        </div>

        {/* Application Volume Forecast */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Application Volume Forecast</h3>
            <div className="group relative">
              <span className="text-gray-400 cursor-help">ℹ️</span>
              <div className="hidden group-hover:block absolute right-0 w-64 bg-gray-800 text-white text-sm rounded p-2 z-10">
                {forecastData.metadata.description}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                interval={Math.floor(forecastData.data.length / 10)}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke={colors.primary}
                strokeWidth={2}
                dot={false}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={colors.secondary}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Forecast"
                data={forecastData.data.filter(d => d.isForecast)}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-2">
            Last 90 days (solid) + Next 30 days forecast (dashed)
          </p>
        </div>

        {/* Future Skill Demand */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Emerging Skills</h3>
            <div className="group relative">
              <span className="text-gray-400 cursor-help">ℹ️</span>
              <div className="hidden group-hover:block absolute right-0 w-64 bg-gray-800 text-white text-sm rounded p-2 z-10">
                {skillDemandData.metadata.description}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={skillDemandData.skills} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Growth %', position: 'bottom' }} />
              <YAxis dataKey="skill" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="growthRate" fill={colors.info}>
                {skillDemandData.skills.map((entry, index) => (
                  <cell key={`cell-${index}`} fill={entry.growthRate > 50 ? colors.success : colors.info} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 mt-2">
            Top 10 skills with increasing frequency in candidate resumes
          </p>
        </div>

      </div>
    </div>
  );
}
