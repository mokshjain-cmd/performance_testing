import { useState } from 'react';
import type { FitnessAgeProfile } from '../../types/fitnessAge';
import { isWindowError } from '../../types/fitnessAge';
import { METRIC_DEFS, METRIC_GROUPS } from '../../utils/fitnessAgeMetricDefs';
import FitnessAgeHero from './FitnessAgeHero';
import MetricCard from './MetricCard';
import InsufficientDataCard from './InsufficientDataCard';

interface FitnessAgeDetailProps {
  profile: FitnessAgeProfile;
}

type WindowKey = 'sixtyDay' | 'sevenDay';

export default function FitnessAgeDetail({ profile }: FitnessAgeDetailProps) {
  const sixty = profile.windows?.sixtyDay;
  const seven = profile.windows?.sevenDay;
  const sixtyValid = sixty && !isWindowError(sixty);
  const sevenValid = seven && !isWindowError(seven);

  const [selected, setSelected] = useState<WindowKey>(sixtyValid ? 'sixtyDay' : 'sevenDay');

  if (!sixtyValid && !sevenValid) {
    return (
      <InsufficientDataCard
        message={
          (sixty && isWindowError(sixty) && sixty.error) ||
          'We\'re still gathering enough wear data to lock in a Fitness Age. Check back once more days of data have synced.'
        }
      />
    );
  }

  const activeOutcome = selected === 'sixtyDay' ? sixty : seven;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          onClick={() => setSelected('sixtyDay')}
          disabled={!sixtyValid}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            selected === 'sixtyDay'
              ? 'bg-gray-900 text-white'
              : sixtyValid
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          60-Day Core
        </button>
        <button
          onClick={() => setSelected('sevenDay')}
          disabled={!sevenValid}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            selected === 'sevenDay'
              ? 'bg-gray-900 text-white'
              : sevenValid
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          7-Day Momentum
        </button>
      </div>

      {!activeOutcome || isWindowError(activeOutcome) ? (
        <InsufficientDataCard
          message={(activeOutcome && isWindowError(activeOutcome) && activeOutcome.error) || 'Not enough data for this window yet.'}
        />
      ) : (
        <>
          <FitnessAgeHero
            fitnessAge={activeOutcome.fitness_age ?? profile.demographics?.age ?? 0}
            chronoAge={profile.demographics?.age ?? 0}
            paceOfAging={activeOutcome.pace_of_aging}
            computedAt={profile.computedAt}
          />

          {METRIC_GROUPS.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 rounded bg-gradient-to-b from-green-500 to-green-200" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-700">{group.label}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.metrics.map((key) => (
                  <MetricCard key={key} def={METRIC_DEFS[key]} metric={activeOutcome.metrics[key]} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
