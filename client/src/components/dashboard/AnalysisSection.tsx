import React from 'react';
import type { Analysis } from '../../types';

interface Props {
  analysis: Analysis;
}

const AnalysisSection: React.FC<Props> = ({ analysis }) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
      <h2 className="mb-3 text-xl font-semibold text-gray-800">
        Device Comparisons
      </h2>

      {/* Pairwise Comparisons */}
      {analysis?.pairwiseComparisons && analysis.pairwiseComparisons.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.pairwiseComparisons.map((pair, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3 font-semibold text-gray-800">
                  {pair.d1} <span className="text-gray-500">vs</span> {pair.d2}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">MAE:</span>
                    <span className="font-medium text-gray-800">{pair.mae.toFixed(2)} <span className="text-xs text-gray-500">BPM</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">RMSE:</span>
                    <span className="font-medium text-gray-800">{pair.rmse.toFixed(2)} <span className="text-xs text-gray-500">BPM</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pearson R:</span>
                    <span className="font-medium text-gray-800">{pair.pearsonR.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Bias:</span>
                    <span className="font-medium text-gray-800">{pair.meanBias.toFixed(2)} <span className="text-xs text-gray-500">BPM</span></span>
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
