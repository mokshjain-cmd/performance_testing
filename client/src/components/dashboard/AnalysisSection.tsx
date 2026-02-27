import React from 'react';
import type { Analysis } from '../../types';
import BlandAltmanChart from './BlandAltmanChart';

interface Props {
  analysis: Analysis;
  isAdmin?: boolean;
}

const AnalysisSection: React.FC<Props> = ({ analysis, isAdmin = false }) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
      <h2 className="mb-3 text-xl font-semibold text-gray-800">
        Device Comparisons
      </h2>

      {/* Pairwise Comparisons */}
      {analysis?.pairwiseComparisons && analysis.pairwiseComparisons.length > 0 ? (
        <div>
          <div className="space-y-3">
            {analysis.pairwiseComparisons.map((pair, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-8">
                  {/* Device Comparison Title */}
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <span className="font-semibold text-gray-800 text-base">
                      {pair.d1} <span className="text-gray-500 font-normal mx-1">vs</span> {pair.d2}
                    </span>
                  </div>
                  
                  {/* Stats spread across full width */}
                  <div className="flex items-center justify-around flex-1 gap-6 text-sm">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-gray-600 text-xs font-medium">MAE</span>
                      <span className="font-semibold text-gray-800 text-base">
                        {pair.mae != null ? pair.mae.toFixed(2) : '--'} <span className="text-xs text-gray-500 font-normal">BPM</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-gray-600 text-xs font-medium">RMSE</span>
                      <span className="font-semibold text-gray-800 text-base">
                        {pair.rmse != null ? pair.rmse.toFixed(2) : '--'} <span className="text-xs text-gray-500 font-normal">BPM</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-gray-600 text-xs font-medium">Pearson R</span>
                      <span className="font-semibold text-gray-800 text-base">
                        {pair.pearsonR != null ? pair.pearsonR.toFixed(3) : '--'}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-gray-600 text-xs font-medium">Mean Bias</span>
                      <span className="font-semibold text-gray-800 text-base">
                        {pair.meanBias != null ? pair.meanBias.toFixed(2) : '--'} <span className="text-xs text-gray-500 font-normal">BPM</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Metric Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-2">How to Interpret Metrics:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><span className="font-medium">MAE:</span> Mean Absolute Error (BPM) | Lower is better | Target: &lt;5 BPM</div>
                <div><span className="font-medium">RMSE:</span> Root Mean Square Error (BPM) | Penalizes large spikes | Target: &lt;7 BPM</div>
                <div><span className="font-medium">Pearson R:</span> Correlation (-1 to 1) | Higher is better | Target: &gt;0.9</div>
                <div><span className="font-medium">Mean Bias:</span> Systematic error (BPM) | Closer to 0 is better | Target: ±2 BPM</div>
              </div>
            </div>
          </div>
          
          {/* Bland-Altman Plot for Luna vs Benchmark (Admin Only) */}
          {isAdmin && (() => {
            // Find Luna vs benchmark comparison (Luna is always d1, benchmark is d2)
            const lunaComparison = analysis.pairwiseComparisons.find(
              pair => pair.d1 === 'luna' && pair.d2 !== 'luna'
            );
            
            if (lunaComparison?.blandAltman) {
              return (
                <div className="mt-6">
                  <BlandAltmanChart
                    blandAltmanData={lunaComparison.blandAltman}
                    metric={analysis.metric || 'HR'}
                    device1={lunaComparison.d1}
                    device2={lunaComparison.d2}
                  />
                </div>
              );
            }
            return null;
          })()}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No device comparisons available for this session.
        </div>
      )}
    </div>
  );
};

export default AnalysisSection;
