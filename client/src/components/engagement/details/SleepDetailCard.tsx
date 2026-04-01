import React from 'react';
import { Moon, Clock, Star, TrendingUp } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { StatBadge } from '../charts/StatBadge';
import { SleepHypnograph } from '../charts/SleepHypnograph';
import { ProgressRing } from '../charts/ProgressRing';
import type { DailyMetrics } from '../../../types/engagement';

interface SleepDetailCardProps {
  metrics: DailyMetrics;
}

// Helper to convert seconds to hours and minutes
const secondsToHM = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { hours, minutes };
};

export const SleepDetailCard: React.FC<SleepDetailCardProps> = ({ metrics }) => {
  const { sleep } = metrics;
  
  // Console log to see received Sleep data
  console.log('😴 [SLEEP DETAIL] Received sleep data:', {
    hasData: sleep.hasData,
    sleepScore: sleep.sleepScore,
    totalSleepMinutes: sleep.totalSleepMinutes,
    hypnographCount: sleep.hypnograph?.length || 0,
    sampleHypnograph: sleep.hypnograph?.slice(0, 3)
  });
  
  if (!sleep.hasData || !sleep.sleepScore) {
    return (
      <MetricCard title="Sleep" icon={Moon} iconColor="text-purple-500">
        <div className="text-center py-8 text-gray-500">
          <Moon className="mx-auto mb-2 opacity-30" size={48} />
          <p>No sleep data available for this day</p>
        </div>
      </MetricCard>
    );
  }

  const totalSleep = sleep.totalSleepMinutes || 0;
  const totalSleepHM = secondsToHM(totalSleep * 60);
  
  // Calculate stage durations
  const stages = sleep.stages || { deepSec: 0, remSec: 0, lightSec: 0, awakeSec: 0 };
  const deepHM = secondsToHM(stages.deepSec);
  const remHM = secondsToHM(stages.remSec);
  const lightHM = secondsToHM(stages.lightSec);
  const awakeHM = secondsToHM(stages.awakeSec);
  
  const totalStageSec = stages.deepSec + stages.remSec + stages.lightSec + stages.awakeSec;
  const deepPercent = totalStageSec > 0 ? (stages.deepSec / totalStageSec) * 100 : 0;
  const remPercent = totalStageSec > 0 ? (stages.remSec / totalStageSec) * 100 : 0;
  const lightPercent = totalStageSec > 0 ? (stages.lightSec / totalStageSec) * 100 : 0;
  const awakePercent = totalStageSec > 0 ? (stages.awakeSec / totalStageSec) * 100 : 0;
  
  // Sleep efficiency
  const sleepEfficiency = totalStageSec > 0 
    ? ((stages.deepSec + stages.remSec + stages.lightSec) / totalStageSec) * 100 
    : 0;
  
  // Parse times
  const startTime = sleep.startTime ? new Date(sleep.startTime) : new Date();
  const endTime = sleep.endTime ? new Date(sleep.endTime) : new Date(startTime.getTime() + totalSleep * 60000);
  
  // Convert hypnograph data from DB format to component format
  const sleepStages = sleep.hypnograph && sleep.hypnograph.length > 0
    ? convertHypnographToStages(sleep.hypnograph)
    : [];

  // Helper function to convert hypnograph points to stage segments
  function convertHypnographToStages(
    hypnograph: Array<{ timestamp: string; stage: 'awake' | 'light' | 'deep' | 'rem' }>
  ) {
    if (hypnograph.length === 0) return [];
    
    const stages: Array<{
      stage: 'deep' | 'rem' | 'light' | 'awake';
      startTime: Date;
      endTime: Date;
      durationMinutes: number;
    }> = [];
    
    let currentStage = hypnograph[0].stage;
    let stageStart = new Date(hypnograph[0].timestamp);
    
    for (let i = 1; i < hypnograph.length; i++) {
      if (hypnograph[i].stage !== currentStage || i === hypnograph.length - 1) {
        const stageEnd = i === hypnograph.length - 1 
          ? new Date(hypnograph[i].timestamp)
          : new Date(hypnograph[i - 1].timestamp);
        
        const durationMinutes = Math.round((stageEnd.getTime() - stageStart.getTime()) / 60000);
        
        if (durationMinutes > 0) {
          stages.push({
            stage: currentStage,
            startTime: stageStart,
            endTime: stageEnd,
            durationMinutes
          });
        }
        
        currentStage = hypnograph[i].stage;
        stageStart = new Date(hypnograph[i].timestamp);
      }
    }
    
    return stages;
  }

  return (
    <MetricCard title="Sleep Analysis" icon={Moon} iconColor="text-purple-500">
      <div className="space-y-3">
        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBadge
            label="Sleep Score"
            value={sleep.sleepScore}
            unit="/100"
            color="purple"
            size="sm"
            icon={<Star size={16} />}
          />
          <StatBadge
            label="Total Sleep"
            value={`${totalSleepHM.hours}h ${totalSleepHM.minutes}m`}
            color="blue"
            size="sm"
            icon={<Clock size={16} />}
          />
          <StatBadge
            label="Efficiency"
            value={sleepEfficiency.toFixed(0)}
            unit="%"
            color="green"
            size="sm"
            icon={<TrendingUp size={16} />}
          />
          <StatBadge
            label="Time in Bed"
            value={`${Math.floor((endTime.getTime() - startTime.getTime()) / 3600000)}h`}
            color="gray"
            size="sm"
          />
        </div>

        {/* Sleep Score Ring */}
        <div className="flex justify-center py-4">
          <ProgressRing
            value={sleep.sleepScore}
            max={100}
            size={140}
            strokeWidth={12}
            color="#8b5cf6"
            label="Sleep Quality"
            showValue={true}
          />
        </div>

        {/* Sleep Timeline */}
        <div className="bg-gradient-to-b from-purple-50 to-white rounded-lg p-3 border border-purple-200">
          <div className="text-sm font-semibold text-purple-900 mb-4">Sleep Timeline</div>
          <div className="flex items-center gap-4 text-sm text-gray-700 mb-4">
            <div>
              <span className="text-gray-500">Bedtime:</span>
              <span className="ml-2 font-semibold">
                {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-gray-300">→</div>
            <div>
              <span className="text-gray-500">Wake:</span>
              <span className="ml-2 font-semibold">
                {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          
          {sleepStages.length > 0 ? (
            <SleepHypnograph
              stages={sleepStages}
              startTime={startTime}
              endTime={endTime}
              height={180}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No detailed sleep stage data available</p>
              <p className="text-xs mt-2">Only summary statistics are available for this day</p>
            </div>
          )}
        </div>

        {/* Stage Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          {/* Deep Sleep */}
          <div className="bg-gradient-to-br from-blue-900/10 to-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 uppercase">Deep Sleep</span>
              <span className="text-lg font-bold text-blue-900">{deepHM.hours}h {deepHM.minutes}m</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-900 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${deepPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{deepPercent.toFixed(0)}% of sleep</div>
          </div>

          {/* REM Sleep */}
          <div className="bg-gradient-to-br from-purple-500/10 to-white rounded-lg p-3 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 uppercase">REM Sleep</span>
              <span className="text-lg font-bold text-purple-900">{remHM.hours}h {remHM.minutes}m</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${remPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{remPercent.toFixed(0)}% of sleep</div>
          </div>

          {/* Light Sleep */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-white rounded-lg p-3 border border-cyan-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 uppercase">Light Sleep</span>
              <span className="text-lg font-bold text-cyan-900">{lightHM.hours}h {lightHM.minutes}m</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${lightPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{lightPercent.toFixed(0)}% of sleep</div>
          </div>

          {/* Awake */}
          <div className="bg-gradient-to-br from-red-500/10 to-white rounded-lg p-3 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 uppercase">Awake</span>
              <span className="text-lg font-bold text-red-900">{awakeHM.hours}h {awakeHM.minutes}m</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${awakePercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{awakePercent.toFixed(0)}% of time</div>
          </div>
        </div>
      </div>
    </MetricCard>
  );
};
