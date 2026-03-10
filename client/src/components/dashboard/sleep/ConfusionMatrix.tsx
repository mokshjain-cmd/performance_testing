import React from 'react';

interface ConfusionMatrixProps {
  matrix: {
    deep_deep: number;
    deep_light: number;
    deep_rem: number;
    deep_awake: number;
    light_deep: number;
    light_light: number;
    light_rem: number;
    light_awake: number;
    rem_deep: number;
    rem_light: number;
    rem_rem: number;
    rem_awake: number;
    awake_deep: number;
    awake_light: number;
    awake_rem: number;
    awake_awake: number;
  };
}

const stages = ['Deep', 'Light', 'REM', 'Awake'];

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({ matrix }) => {
  // Get max value for color scaling
  const values = Object.values(matrix);
  const maxValue = Math.max(...values);

  const getOpacity = (value: number) => {
    return maxValue === 0 ? 0.1 : 0.3 + (value / maxValue) * 0.7;
  };

  const getValue = (predicted: string, actual: string) => {
    const key = `${predicted.toLowerCase()}_${actual.toLowerCase()}`;
    return matrix[key as keyof typeof matrix] || 0;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">
            <strong>Rows:</strong> Actual Stage (Benchmark)
          </p>
          <p className="text-sm text-gray-600">
            <strong>Columns:</strong> Predicted Stage (Falcon)
          </p>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100"></th>
              {stages.map((stage) => (
                <th
                  key={stage}
                  className="border border-gray-300 p-2 bg-gray-100 font-semibold text-center"
                >
                  {stage}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((actualStage) => (
              <tr key={actualStage}>
                <td className="border border-gray-300 p-2 bg-gray-100 font-semibold text-right">
                  {actualStage}
                </td>
                {stages.map((predictedStage) => {
                  const value = getValue(predictedStage, actualStage);
                  const isCorrect = actualStage === predictedStage;
                  return (
                    <td
                      key={predictedStage}
                      className="border border-gray-300 p-2 text-center relative"
                      style={{
                        backgroundColor: isCorrect
                          ? `rgba(16, 185, 129, ${getOpacity(value)})`
                          : `rgba(239, 68, 68, ${getOpacity(value)})`,
                      }}
                    >
                      <span className="font-mono text-sm">{value}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 opacity-70"></div>
            <span>Correct Predictions (Diagonal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 opacity-70"></div>
            <span>Misclassifications (Off-Diagonal)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
