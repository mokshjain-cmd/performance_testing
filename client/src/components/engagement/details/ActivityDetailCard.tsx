import React from 'react';
import { Activity, Footprints, Flame, TrendingUp, MapPin } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { StatBadge } from '../charts/StatBadge';
import { ProgressRing } from '../charts/ProgressRing';
import type { DailyMetrics } from '../../../types/engagement';

interface ActivityDetailCardProps {
  metrics: DailyMetrics;
}

export const ActivityDetailCard: React.FC<ActivityDetailCardProps> = ({ metrics }) => {
  const { activity } = metrics;
  
  if (!activity.hasData) {
    return (
      <MetricCard title="Activity" icon={Activity} iconColor="text-blue-500">
        <div className="text-center py-8 text-gray-500">
          <Activity className="mx-auto mb-2 opacity-30" size={48} />
          <p>No activity data available for this day</p>
        </div>
      </MetricCard>
    );
  }

  const steps = activity.steps || 0;
  const distanceKm = activity.distanceMeters ? (activity.distanceMeters / 1000) : 0;
  const distanceMi = distanceKm * 0.621371;
  const caloriesTotal = activity.caloriesTotal || 0;
  const caloriesActive = activity.caloriesActive || 0;
  const caloriesBasal = activity.caloriesBasal || caloriesTotal - caloriesActive;
  
  // Calculate percentages
  const stepsGoal = 10000;
  const stepsPercent = (steps / stepsGoal) * 100;
  const activeCaloriesPercent = caloriesTotal > 0 ? (caloriesActive / caloriesTotal) * 100 : 0;
  
  return (
    <MetricCard title="Activity Summary" icon={Activity} iconColor="text-blue-500">
      <div className="space-y-3">
        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBadge
            label="Steps"
            value={steps.toLocaleString()}
            color="blue"
            size="sm"
            icon={<Footprints size={16} />}
          />
          <StatBadge
            label="Distance"
            value={distanceKm.toFixed(2)}
            unit="km"
            color="green"
            size="sm"
            icon={<MapPin size={16} />}
          />
          <StatBadge
            label="Total Calories"
            value={caloriesTotal.toLocaleString()}
            unit="kcal"
            color="red"
            size="sm"
            icon={<Flame size={16} />}
          />
          <StatBadge
            label="Active Calories"
            value={caloriesActive.toLocaleString()}
            unit="kcal"
            color="orange"
            size="sm"
          />
        </div>

        {/* Progress Rings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {/* Steps Progress */}
          <div className="flex flex-col items-center">
            <ProgressRing
              value={steps}
              max={stepsGoal}
              size={130}
              strokeWidth={12}
              color="#3b82f6"
              showValue={true}
            />
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-900">Steps Goal</div>
              <div className="text-xs text-gray-600">
                {stepsPercent > 100 ? '🎉 Goal exceeded!' : `${Math.round(stepsPercent)}% complete`}
              </div>
            </div>
          </div>

          {/* Distance Visual */}
          <div className="flex flex-col items-center justify-center">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-full w-32 h-32 flex flex-col items-center justify-center border-4 border-green-200">
              <MapPin className="text-green-600 mb-1" size={28} />
              <div className="text-2xl font-bold text-green-900">{distanceKm.toFixed(2)}</div>
              <div className="text-xs text-green-700">kilometers</div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-900">Distance Covered</div>
              <div className="text-xs text-gray-600">{distanceMi.toFixed(2)} miles</div>
            </div>
          </div>

          {/* Calories Breakdown */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <ProgressRing
                value={caloriesActive}
                max={caloriesTotal}
                size={130}
                strokeWidth={12}
                color="#f97316"
                showValue={false}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Flame className="text-orange-500 mb-1" size={24} />
                <div className="text-2xl font-bold text-gray-900">{caloriesTotal}</div>
                <div className="text-xs text-gray-600">kcal</div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-900">Total Burned</div>
              <div className="text-xs text-gray-600">{Math.round(activeCaloriesPercent)}% active</div>
            </div>
          </div>
        </div>

        {/* Calories Breakdown Bar */}
        <div className="bg-gradient-to-b from-orange-50 to-white rounded-lg p-4 border border-orange-200">
          <div className="text-sm font-semibold text-orange-900 mb-3">Calorie Breakdown</div>
          <div className="space-y-3">
            {/* Active Calories */}
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-700 font-medium">Active Calories</span>
                <span className="text-orange-700 font-bold">{caloriesActive} kcal</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${activeCaloriesPercent}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Calories burned through activity and exercise
              </div>
            </div>

            {/* Basal Calories */}
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-700 font-medium">Basal Calories</span>
                <span className="text-blue-700 font-bold">{caloriesBasal} kcal</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${100 - activeCaloriesPercent}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Calories burned at rest (metabolism)
              </div>
            </div>
          </div>
        </div>

        {/* Activity Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Steps Analysis */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Footprints className="text-blue-600" size={20} />
              <span className="text-sm font-semibold text-blue-900">Step Analysis</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Steps per km:</span>
                <span className="font-semibold text-gray-900">
                  {distanceKm > 0 ? Math.round(steps / distanceKm) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg stride:</span>
                <span className="font-semibold text-gray-900">
                  {distanceKm > 0 && steps > 0 ? ((distanceKm * 1000) / steps).toFixed(2) + ' m' : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Goal progress:</span>
                <span className={`font-semibold ${stepsPercent >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {Math.round(stepsPercent)}%
                </span>
              </div>
            </div>
          </div>

          {/* Intensity Analysis */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-orange-600" size={20} />
              <span className="text-sm font-semibold text-orange-900">Intensity</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Calories per step:</span>
                <span className="font-semibold text-gray-900">
                  {steps > 0 ? (caloriesTotal / steps).toFixed(3) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active ratio:</span>
                <span className="font-semibold text-gray-900">
                  {activeCaloriesPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Activity level:</span>
                <span className={`font-semibold ${
                  activeCaloriesPercent > 40 ? 'text-green-600' :
                  activeCaloriesPercent > 25 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {activeCaloriesPercent > 40 ? 'High' : activeCaloriesPercent > 25 ? 'Moderate' : 'Low'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MetricCard>
  );
};
