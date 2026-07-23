import type { FitnessAgeMetric } from '../../types/fitnessAge';
import {
  deriveStatus,
  describeMetric,
  formatMetricValue,
  goodnessPercent,
  momentumMessage,
  positionPercent,
  type MetricDef,
  type Momentum,
} from '../../utils/fitnessAgeMetricDefs';

export interface Vo2Breakdown {
  bracket?: string;
  jackWeight?: number;
  hrrWeight?: number;
  hrr?: number | null;
  jackson?: number | null;
  legacy?: number | null;
}

interface MetricCardProps {
  def: MetricDef;
  metric?: FitnessAgeMetric;
  breakdown?: Vo2Breakdown;
  momentum?: Momentum | null;
  sevenDayValue?: number | null;
}

const MOMENTUM_STYLES = {
  ahead: { pillBg: 'bg-green-50 text-green-700 border-green-200', label: '7-Day Ahead', icon: '↑', dot: '#16a34a' },
  lagging: { pillBg: 'bg-amber-50 text-amber-700 border-amber-200', label: '7-Day Lagging', icon: '↓', dot: '#d97706' },
  breakeven: { pillBg: 'bg-blue-50 text-blue-700 border-blue-200', label: '7-Day On Track', icon: '≈', dot: '#2563eb' },
};

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

export default function MetricCard({ def, metric, breakdown, momentum, sevenDayValue }: MetricCardProps) {
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

  const pos7 = sevenDayValue != null ? positionPercent(def.range, sevenDayValue) : null;
  const momentumDotColor = momentum ? MOMENTUM_STYLES[momentum.status].dot : '#9ca3af';
  const sevenDayTooltip =
    pos7 != null
      ? `7-day average: ${formatMetricValue(def.key, sevenDayValue ?? null)} ${def.unit}` +
        (momentum ? ` — ${momentumMessage(momentum.status, def.topic)}` : '')
      : undefined;

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

      {momentum && (
        <div
          className={`flex items-start gap-2 text-xs rounded-xl border px-3 py-2 ${MOMENTUM_STYLES[momentum.status].pillBg}`}
        >
          <span className="font-bold flex-shrink-0">{MOMENTUM_STYLES[momentum.status].icon}</span>
          <span className="leading-relaxed">{momentumMessage(momentum.status, def.topic)}</span>
        </div>
      )}

      <div>
        <div className="relative h-1.5 rounded-full" style={{ background: trackGradient }}>
          <div
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 shadow"
            style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)', borderColor: style.ring, zIndex: 1 }}
          />
          {pos7 != null && (
            <div
              className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm cursor-help"
              style={{ left: `${pos7}%`, transform: 'translate(-50%, -50%)', background: momentumDotColor, zIndex: 2 }}
              title={sevenDayTooltip}
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] font-medium text-gray-400">
          <span>{def.range[0].toLocaleString()}{bestLeft ? <span className="ml-1 text-green-600 font-semibold">Best</span> : null}</span>
          {pos7 != null && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: momentumDotColor }} />
              7-day avg <span className="font-semibold text-gray-600">{formatMetricValue(def.key, sevenDayValue ?? null)}</span>
            </span>
          )}
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

      {breakdown && <Vo2BreakdownPanel breakdown={breakdown} />}
    </div>
  );
}

/**
 * Explains how the ensemble VO₂ was weighted. The engine blends an
 * activity-based estimate (Jackson) and a heart-rate-based estimate (HRR)
 * using a bracket chosen from the user's activity level + HR reserve — this
 * panel surfaces that reasoning instead of hiding it behind a single number.
 */
function Vo2BreakdownPanel({ breakdown }: { breakdown: Vo2Breakdown }) {
  const { bracket, jackWeight, hrrWeight, hrr, jackson, legacy } = breakdown;
  const hasWeights = jackWeight != null && hrrWeight != null && (jackWeight > 0 || hrrWeight > 0);
  const hasEstimates = jackson != null || hrr != null || legacy != null;
  if (!bracket && !hasWeights && !hasEstimates) return null;

  const jackPct = Math.round((jackWeight ?? 0) * 100);
  const hrrPct = Math.round((hrrWeight ?? 0) * 100);
  const fmt = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
  const bracketLabel = bracket && bracket !== 'None' ? bracket.replace(/^Bracket \d+:\s*/, '') : null;

  return (
    <details className="group border-t border-gray-100 pt-3 -mt-1">
      <summary className="flex items-center justify-between cursor-pointer list-none text-[11px] font-semibold text-gray-500 hover:text-gray-700 select-none">
        <span className="uppercase tracking-wide">Why this weighting?</span>
        <svg
          className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </summary>

      <div className="mt-3 space-y-3">
        {bracketLabel && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Model</span>
            <span className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
              {bracketLabel}
            </span>
          </div>
        )}

        {hasWeights && (
          <div className="space-y-2">
            <WeightBar label="Activity model (Jackson)" pct={jackPct} color="#0ea5e9" />
            <WeightBar label="Heart-rate model (HRR)" pct={hrrPct} color="#16a34a" />
          </div>
        )}

        {hasEstimates && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <SubEstimate label="Jackson" value={fmt(jackson)} />
            <SubEstimate label="HRR" value={fmt(hrr)} />
            <SubEstimate label="Legacy 70/30" value={fmt(legacy)} />
          </div>
        )}
      </div>
    </details>
  );
}

function WeightBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SubEstimate({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center bg-gray-50 border border-gray-100 rounded-lg py-1.5">
      <div className="text-sm font-bold text-gray-800 leading-none">{value}</div>
      <div className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}
