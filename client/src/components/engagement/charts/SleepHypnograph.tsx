import React from 'react';
import { COLORS, SLEEP_STAGE_LABELS } from './constants';

interface SleepStage {
  stage: 'deep' | 'rem' | 'light' | 'awake';
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

interface SleepHypnographProps {
  stages: SleepStage[];
  startTime: Date;
  endTime: Date;
  height?: number;
}

export const SleepHypnograph: React.FC<SleepHypnographProps> = ({
  stages,
  startTime,
  endTime,
  height = 180
}) => {
  const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);
  
  const stageOrder = ['deep', 'light', 'rem', 'awake']; // Bottom to top
  const stageYPositions = {
    deep: 3,
    light: 2,
    rem: 1,
    awake: 0
  };

  const stageColors = {
    deep: COLORS.sleep.stages.deep,
    rem: COLORS.sleep.stages.rem,
    light: COLORS.sleep.stages.light,
    awake: COLORS.sleep.stages.awake
  };

  // Generate hypnograph path
  const generateHypnographPath = () => {
    if (stages.length === 0) return '';
    
    let path = '';
    const chartHeight = height - 40; // Leave space for labels
    const stageHeight = chartHeight / 4; // 4 stages
    
    stages.forEach((stage, index) => {
      const startMinutes = Math.floor((stage.startTime.getTime() - startTime.getTime()) / 1000 / 60);
      const endMinutes = Math.floor((stage.endTime.getTime() - startTime.getTime()) / 1000 / 60);
      
      const xStart = (startMinutes / totalMinutes) * 100;
      const xEnd = (endMinutes / totalMinutes) * 100;
      const yPos = stageYPositions[stage.stage as keyof typeof stageYPositions] * stageHeight;
      
      if (index === 0) {
        path += `M ${xStart} ${yPos} `;
      } else {
        // Vertical line to new stage
        path += `V ${yPos} `;
      }
      
      // Horizontal line for duration
      path += `H ${xEnd} `;
    });
    
    return path;
  };

  // Calculate position for each stage block
  const getStageBlock = (stage: SleepStage) => {
    const startMinutes = Math.floor((stage.startTime.getTime() - startTime.getTime()) / 1000 / 60);
    const endMinutes = Math.floor((stage.endTime.getTime() - startTime.getTime()) / 1000 / 60);
    const left = (startMinutes / totalMinutes) * 100;
    const width = ((endMinutes - startMinutes) / totalMinutes) * 100;
    const yPos = stageYPositions[stage.stage as keyof typeof stageYPositions];
    return { left, width, yPos };
  };

  // Generate time labels
  const generateTimeLabels = () => {
    const labels = [];
    const hourInterval = Math.max(1, Math.ceil(totalMinutes / 480)); // Roughly every 1-2 hours
    
    for (let i = 0; i <= Math.ceil(totalMinutes / 60); i += hourInterval) {
      const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      labels.push({
        position: (i * 60 / totalMinutes) * 100,
        label: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      });
    }
    
    return labels;
  };

  const chartHeight = height - 40;
  const stageHeight = chartHeight / 4;

  return (
    <div className="space-y-3">
      {/* Hypnograph Chart */}
      <div className="relative bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-4">
        <div className="relative" style={{ height: `${height}px` }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 w-14 flex flex-col justify-start pr-2" style={{ height: `${chartHeight}px` }}>
            {stageOrder.map((stage, index) => (
              <div 
                key={stage}
                className="flex items-center justify-end text-[11px] font-semibold text-gray-600"
                style={{ 
                  height: `${stageHeight}px`
                }}
              >
                {SLEEP_STAGE_LABELS[stage as keyof typeof SLEEP_STAGE_LABELS]}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="absolute left-14 right-0 top-0 border-l border-gray-300" style={{ height: `${chartHeight}px` }}>
            {/* Grid lines */}
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ top: `${level * stageHeight}px` }}
              />
            ))}

            {/* Stage blocks with color fills */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {stages.map((stage, index) => {
                const { left, width, yPos } = getStageBlock(stage);
                
                return (
                  <g key={index}>
                    {/* Colored rectangle for stage */}
                    <rect
                      x={`${left}%`}
                      y={yPos * stageHeight}
                      width={`${width}%`}
                      height={stageHeight}
                      fill={stageColors[stage.stage]}
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="0.5"
                      className="transition-opacity duration-200 hover:opacity-80"
                    >
                      <title>{`${SLEEP_STAGE_LABELS[stage.stage]}: ${stage.durationMinutes} min\n${stage.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${stage.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`}</title>
                    </rect>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X-axis time labels */}
          <div className="absolute left-14 right-0 border-t border-gray-300 pt-2 flex justify-between px-1" style={{ top: `${chartHeight}px` }}>
            {generateTimeLabels().map((label, index) => (
              <span
                key={index}
                className="text-xs text-gray-600 font-medium"
              >
                {label.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        {stageOrder.reverse().map((stage) => (
          <div key={stage} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: stageColors[stage as keyof typeof stageColors] }}
            />
            <span className="text-gray-700 font-medium">
              {SLEEP_STAGE_LABELS[stage as keyof typeof SLEEP_STAGE_LABELS]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
