import React from 'react';
import type { Analysis } from '../../types';

interface Props {
  analysis: Analysis;
}

const AnalysisSection: React.FC<Props> = ({ analysis }) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800">
        📊 Session Analysis
      </h2>

      {/* Device Stats */}
      {analysis?.deviceStats && analysis.deviceStats.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-medium text-gray-700">Device Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.deviceStats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{stat.deviceType}</span>
                  <span className="text-xs bg-indigo-100 px-2 py-1 rounded-full text-indigo-700 font-medium">
                    {stat.firmwareVersion}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min:</span>
                    <span className="font-medium text-gray-800">{stat.hr.min.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max:</span>
                    <span className="font-medium text-gray-800">{stat.hr.max.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg:</span>
                    <span className="font-medium text-gray-800">{stat.hr.avg.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Median:</span>
                    <span className="font-medium text-gray-800">{stat.hr.median.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">StdDev:</span>
                    <span className="font-medium text-gray-800">{stat.hr.stdDev.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Range:</span>
                    <span className="font-medium text-gray-800">{stat.hr.range.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pairwise Comparisons */}
      {analysis?.pairwiseComparisons && analysis.pairwiseComparisons.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-700">Device Comparisons</h3>
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
                    <span className="font-medium text-gray-800">{pair.mae.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">RMSE:</span>
                    <span className="font-medium text-gray-800">{pair.rmse.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pearson R:</span>
                    <span className="font-medium text-gray-800">{pair.pearsonR.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Bias:</span>
                    <span className="font-medium text-gray-800">{pair.meanBias.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisSection;
