import { useState } from 'react';

const ScoringExplanation = ({ show = false, onClose }) => {
  if (!show) return null;

  const weightageConfig = {
    entry: { 
      resume: 70, 
      test: 30, 
      range: '0-2.4 years',
      description: 'Entry-level roles prioritize potential, education, and foundational skills over extensive experience' 
    },
    mid: { 
      resume: 40, 
      test: 60, 
      range: '2.5-4.4 years',
      description: 'Mid-level roles emphasize practical skills and hands-on experience, with balanced consideration of credentials' 
    },
    senior: { 
      resume: 30, 
      test: 70, 
      range: '4.5-6.9 years',
      description: 'Senior roles require proven technical expertise and problem-solving ability demonstrated through assessments' 
    },
    lead: { 
      resume: 25, 
      test: 75, 
      range: '7+ years',
      description: 'Leadership roles demand exceptional technical skills and decision-making capabilities validated by performance' 
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">📊 Composite Fit Score Calculation</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">How It Works</h3>
            <p className="text-blue-700 text-sm mb-2">
              The Composite Fit Score combines AI resume screening with technical assessment results using 
              weighted calculations based on the job's required experience level.
            </p>
            <p className="text-blue-700 text-sm">
              <strong>Formula:</strong> Composite Score = (AI Score × Resume Weight) + (Test Score × Test Weight)
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">🎯 How Experience Level is Determined</h3>
            <p className="text-purple-700 text-sm mb-2">
              Experience level is automatically determined by the job's required experience range:
            </p>
            <div className="text-sm text-purple-700 space-y-1 ml-4">
              <p>• <strong>Entry Level:</strong> Jobs requiring average &lt; 2.5 years experience</p>
              <p>• <strong>Mid Level:</strong> Jobs requiring average 2.5-4.4 years experience</p>
              <p>• <strong>Senior Level:</strong> Jobs requiring average 4.5-6.9 years experience</p>
              <p>• <strong>Lead Level:</strong> Jobs requiring average 7+ years experience</p>
            </div>
            <p className="text-xs text-purple-600 mt-2 italic">
              Average = (Minimum Required Years + Maximum Required Years) ÷ 2
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">⚖️ Weightage by Experience Level</h3>
            
            {Object.entries(weightageConfig).map(([level, config]) => (
              <div key={level} className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-semibold capitalize text-lg">{level} Level</span>
                    <span className="text-xs text-gray-500 ml-2">({config.range})</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded">
                    {config.resume}% Resume + {config.test}% Test
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Resume/AI Score</span>
                      <span className="font-semibold">{config.resume}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all" 
                        style={{ width: `${config.resume}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Test Score</span>
                      <span className="font-semibold">{config.test}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all" 
                        style={{ width: `${config.test}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-3">💡 Example Calculations</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-gray-800 mb-1">Entry-Level Position (1-3 years required, avg 2.0):</p>
                <p className="text-gray-600">• AI Resume Score: 85% | Test Score: 70%</p>
                <p className="text-gray-600">• Calculation: (85 × 70%) + (70 × 30%) = 59.5 + 21 = <strong className="text-purple-600">80.5%</strong></p>
                <p className="text-xs text-gray-500 mt-1">Resume matters more for entry-level roles</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-gray-800 mb-1">Mid-Level Position (2-5 years required, avg 3.5):</p>
                <p className="text-gray-600">• AI Resume Score: 85% | Test Score: 70%</p>
                <p className="text-gray-600">• Calculation: (85 × 40%) + (70 × 60%) = 34 + 42 = <strong className="text-purple-600">76.0%</strong></p>
                <p className="text-xs text-gray-500 mt-1">Balanced evaluation for mid-level roles</p>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-gray-800 mb-1">Senior Position (3-7 years required, avg 5.0):</p>
                <p className="text-gray-600">• AI Resume Score: 85% | Test Score: 70%</p>
                <p className="text-gray-600">• Calculation: (85 × 30%) + (70 × 70%) = 25.5 + 49 = <strong className="text-purple-600">74.5%</strong></p>
                <p className="text-xs text-gray-500 mt-1">Test performance matters most for senior roles</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">
              Notice: Same candidate scores differently for different experience levels!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringExplanation;