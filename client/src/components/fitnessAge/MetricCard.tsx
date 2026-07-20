import type { FitnessAgeMetric } from '../../types/fitnessAge';
import {
  deriveStatus,
  describeMetric,
  formatMetricValue,
  goodnessPercent,
  positionPercent,
  type MetricDef,
} from '../../utils/fitnessAgeMetricDefs';

interface MetricCardProps {
  def: MetricDef;
  metric?: FitnessAgeMetric;
}

const STATUS_STYLES = {
  outperforming: {
    ring: '#16a34a',
    pillBg: 'bg-green-50 text-green-700 border-green-200',
    label: 'Outperforming',
    impactText: 'text-green-600',
    footLabel: 'Age Benefit',
  },
  pushing: {
    ring: '#2563eb',
    pillBg: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Keep Pushing',
    impactText: 'text-blue-600',
    footLabel: 'No Age Effect',
  },
  reassess: {
    ring: '#d97706',
    pillBg: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Time to Reassess',
    impactText: 'text-amber-600',
    footLabel: 'Age Cost',
  },
};

export default function MetricCard({ def, metric }: MetricCardProps) {
  if (!metric || metric.value == null) {
    return (
      <div className="flex items-center gap-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-5 py-5">
        <div className="w-12 h-12 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg flex-shrink-0">
          —
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-wider uppercase text-gray-400">{def.name}</div>
          <div className="text-xs text-gray-500 mt-1">No data recorded for this period.</div>
        </div>
      </div>
    );
  }

  const deltaYears = metric.delta_years ?? 0;
  const status = deriveStatus(deltaYears);
  const style = STATUS_STYLES[status];
  const fill = goodnessPercent(def, metric.value);
  const pos = positionPercent(def.range, metric.value);

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fill / 100);

  const impactAbs = Math.abs(deltaYears).toFixed(1);
  const impactDir = deltaYears < 0 ? 'yr younger' : deltaYears > 0 ? 'yr older' : 'yr';

  const bestLeft = !!def.betterLow;
  const trackGradient = bestLeft
    ? 'linear-gradient(90deg, rgba(22,163,74,0.35), rgba(209,213,219,0.5))'
    : 'linear-gradient(90deg, rgba(209,213,219,0.5), rgba(22,163,74,0.35))';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={style.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-gray-900 leading-none">
              {formatMetricValue(def.key, metric.value)}
            </span>
            <span className="text-[8px] text-gray-400 mt-0.5 text-center leading-tight px-1">{def.unit}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-sm font-bold uppercase tracking-wide text-gray-800">
              {def.name}
              {def.subtitle && <span className="block text-[10px] font-medium text-gray-400 normal-case">{def.subtitle}</span>}
            </span>
            <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${style.pillBg}`}>
              {style.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{describeMetric(def, status)}</p>
        </div>
      </div>

      <div>
        <div className="relative h-1.5 rounded-full" style={{ background: trackGradient }}>
          <div
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 shadow"
            style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)', borderColor: style.ring }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] font-medium text-gray-400">
          <span>{def.range[0].toLocaleString()}{bestLeft ? <span className="ml-1 text-green-600 font-semibold">Best</span> : null}</span>
          <span>{def.range[1].toLocaleString()}{!bestLeft ? <span className="ml-1 text-green-600 font-semibold">Best</span> : null}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{style.footLabel}</span>
        <span className={`flex items-baseline gap-1 font-bold ${style.impactText}`}>
          <span className="text-xl">{impactAbs}</span>
          <span className="text-[11px] font-semibold">{impactDir}</span>
        </span>
      </div>
    </div>
  );
}
