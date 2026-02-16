import React from 'react';
import type{ Analysis } from '../../types';

interface Props {
  analysis: Analysis;
}

const cardStyle: React.CSSProperties = {
  background: '#f1f5f9',
  borderRadius: 8,
  padding: 12,
  minWidth: 220
};

const AnalysisSection: React.FC<Props> = ({ analysis }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ marginBottom: 12 }}>Session Analysis</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>

        {/* Device Stats */}
        {analysis?.deviceStats?.map((stat, idx) => (
          <div key={idx} style={cardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {stat.deviceType}{' '}
              <span style={{ background: '#e0e7ff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>
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
          <div key={idx} style={{ ...cardStyle, background: '#fef9c3' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
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
