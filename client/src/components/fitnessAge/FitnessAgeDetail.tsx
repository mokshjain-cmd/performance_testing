import type { FitnessAgeProfile } from '../../types/fitnessAge';
import { isWindowError } from '../../types/fitnessAge';
import { deriveMomentum, METRIC_DEFS, METRIC_GROUPS } from '../../utils/fitnessAgeMetricDefs';
import FitnessAgeHero from './FitnessAgeHero';
import MetricCard from './MetricCard';
import InsufficientDataCard from './InsufficientDataCard';

interface FitnessAgeDetailProps {
  profile: FitnessAgeProfile;
}

export default function FitnessAgeDetail({ profile }: FitnessAgeDetailProps) {
  const sixty = profile.windows?.sixtyDay;
  const seven = profile.windows?.sevenDay;
  const sixtyValid = sixty && !isWindowError(sixty);
  const sevenValid = seven && !isWindowError(seven);

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

  // The 60-day window is the baseline everyone sees; the 7-day window is only
  // used to derive momentum call-outs against that baseline, never shown on its own.
  const activeOutcome = sixtyValid ? sixty : seven;
  const momentumBaseline = sixtyValid && sevenValid ? seven : null;

  const overallMomentum =
    momentumBaseline && sixtyValid
      ? deriveMomentum(momentumBaseline.total_delta, sixty.total_delta)
      : null;

  return (
    <div className="space-y-5">
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
            momentum={overallMomentum}
          />

          {METRIC_GROUPS.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 rounded bg-gradient-to-b from-green-500 to-green-200" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-700">{group.label}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.metrics.map((key) => {
                  const m = activeOutcome.metrics;
                  const ens = m.vo2_ensemble;
                  const breakdown =
                    key === 'vo2_ensemble' && ens
                      ? {
                          bracket: ens.bracket,
                          jackWeight: ens.jack_weight,
                          hrrWeight: ens.hrr_weight,
                          hrr: m.vo2_hrr?.value ?? null,
                          jackson: m.vo2_jackson?.value ?? null,
                          legacy: m.vo2_legacy?.value ?? null,
                        }
                      : undefined;
                  const momentum = momentumBaseline
                    ? deriveMomentum(momentumBaseline.metrics[key]?.delta_years, activeOutcome.metrics[key]?.delta_years)
                    : null;
                  const sevenDayValue = momentumBaseline ? momentumBaseline.metrics[key]?.value ?? null : null;
                  return (
                    <MetricCard
                      key={key}
                      def={METRIC_DEFS[key]}
                      metric={activeOutcome.metrics[key]}
                      breakdown={breakdown}
                      momentum={momentum}
                      sevenDayValue={sevenDayValue}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
