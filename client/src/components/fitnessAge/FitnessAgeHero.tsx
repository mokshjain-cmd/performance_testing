interface FitnessAgeHeroProps {
  fitnessAge: number;
  chronoAge: number;
  paceOfAging: number | null;
  computedAt: string;
}

const PACE_MIN = 0.6;
const PACE_MAX = 1.5;

function getPaceInsight(pace: number) {
  if (Math.abs(pace - 1) <= 0.05) {
    return {
      tone: 'info' as const,
      title: 'On Track',
      msg: 'Fitness Age is tracking right alongside chronological age. Wins in sleep and cardio can start pulling it lower.',
    };
  }
  if (pace < 1) {
    return {
      tone: 'good' as const,
      title: 'Ahead of Schedule',
      msg: 'Biological clock is running slower than the calendar. Current habits are holding this edge.',
    };
  }
  return {
    tone: 'warn' as const,
    title: 'Room for Improvement',
    msg: 'Aging faster than calendar time. Cardio consistency and sleep are the highest-leverage levers here.',
  };
}

const TONE_STYLES = {
  good: 'bg-green-50 border-green-100 text-green-800',
  info: 'bg-indigo-50 border-indigo-100 text-indigo-800',
  warn: 'bg-amber-50 border-amber-100 text-amber-800',
};

export default function FitnessAgeHero({ fitnessAge, chronoAge, paceOfAging, computedAt }: FitnessAgeHeroProps) {
  const diff = fitnessAge - chronoAge;
  const younger = diff < -0.05;
  const older = diff > 0.05;
  const pace = paceOfAging ?? fitnessAge / chronoAge;
  const insight = getPaceInsight(pace);
  const pacePct = Math.min(100, Math.max(0, ((pace - PACE_MIN) / (PACE_MAX - PACE_MIN)) * 100));

  return (
    <div className="bg-gradient-to-br from-white to-green-50/40 border border-gray-100 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Fitness Age</div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-bold text-gray-900 tracking-tight">{fitnessAge.toFixed(1)}</span>
            <span className="text-lg text-gray-500">years</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/70 border border-gray-100 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-gray-500">Age difference</span>
            <span className={`font-semibold ${younger ? 'text-green-600' : older ? 'text-amber-600' : 'text-gray-700'}`}>
              {Math.abs(diff) < 0.05
                ? 'On par with actual age'
                : `${Math.abs(diff).toFixed(1)} years ${younger ? 'younger' : 'older'} than actual age`}
            </span>
          </div>
        </div>

        <div className="w-full sm:w-72">
          <div className="bg-white/70 border border-gray-100 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Pace of aging</span>
              <span className="font-semibold text-gray-800">{pace.toFixed(2)}× per year</span>
            </div>
            <div className="relative h-2 rounded-full bg-gradient-to-r from-green-200 via-gray-200 to-amber-200">
              <div
                className="absolute top-1/2 w-3 h-3 rounded-full bg-gray-900 border-2 border-white shadow"
                style={{ left: `${pacePct}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-medium text-gray-400">
              <span>{PACE_MIN.toFixed(1)}×</span>
              <span>1.0×</span>
              <span>{PACE_MAX.toFixed(1)}×</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-5 border rounded-xl px-4 py-3 text-sm ${TONE_STYLES[insight.tone]}`}>
        <div className="font-semibold mb-0.5">{insight.title}</div>
        <div className="opacity-90">{insight.msg}</div>
      </div>

      <div className="mt-3 text-[11px] text-gray-400">
        As of {new Date(computedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
}
