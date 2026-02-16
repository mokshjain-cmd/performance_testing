import React from 'react';
import type { Analysis } from '../../types';

interface Props {
  analysis: Analysis;
}

const AnalysisSection: React.FC<Props> = ({ analysis }) => {
  return (
    <div className="mb-6">
      <h2 className="mb-3 text-xl font-semibold">Session Analysis</h2>

      <div className="flex flex-wrap gap-4">
        
        {/* Device Stats */}
        {analysis?.deviceStats?.map((stat, idx) => (
          <div
            key={idx}
            className="min-w-[220px] rounded-lg bg-slate-100 p-3 shadow-sm"
          >
            <div className="mb-1.5 font-semibold">
              {stat.deviceType}{' '}
              <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-xs">
                {stat.firmwareVersion}
              </span>
            </div>

            <div>Min: {stat.hr.min}</div>
            <div>Max: {stat.hr.max}</div>
            <div>Avg: {stat.hr.avg}</div>
            <div>Median: {stat.hr.median}</div>
            <div>StdDev: {stat.hr.stdDev}</div>
            <div>Range: {stat.hr.range}</div>
          </div>
        ))}

        {/* Pairwise Comparisons */}
        {analysis?.pairwiseComparisons?.map((pair, idx) => (
          <div
            key={idx}
            className="min-w-[220px] rounded-lg bg-yellow-100 p-3 shadow-sm"
          >
            <div className="mb-1.5 font-semibold">
              {pair.d1} vs {pair.d2}
            </div>

            <div>MAE: {pair.mae}</div>
            <div>RMSE: {pair.rmse}</div>
            <div>Pearson R: {pair.pearsonR}</div>
            <div>Mean Bias: {pair.meanBias}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisSection;
