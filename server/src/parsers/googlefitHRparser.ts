import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

interface NormalizedReadingInput {
  meta: {
    sessionId: any;
    userId: any;
    deviceType: string;
    activityType: string;
    bandPosition?: string;
    firmwareVersion?: string;
  };
  timestamp: Date;
  metrics: {
    heartRate: number | null;
  };
  isValid: boolean;
}

export async function parseTCXHR(
  filePath: string,
  meta: {
    sessionId: any;
    userId: any;

    activityType: string;
    bandPosition?: string;
    firmwareVersion?: string;
  },
  startTime: Date,
  endTime: Date
): Promise<NormalizedReadingInput[]> {

  console.log('\n🏃 ========================================');
  console.log('🏃 TCX HR Parser');
  console.log('🏃 File:', filePath);
  //console.log('🏃 Device:', meta.deviceType);
  console.log(
    '🏃 Time Range:',
    startTime.toISOString(),
    '→',
    endTime.toISOString()
  );
  console.log('🏃 ========================================\n');

  const xml = fs.readFileSync(filePath, 'utf8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true,
  });

  const parsed = parser.parse(xml);

  const normalizedReadings: NormalizedReadingInput[] = [];

  try {

    const activities =
      parsed?.TrainingCenterDatabase?.Activities?.Activity;

    const activityArray = Array.isArray(activities)
      ? activities
      : [activities];

    let totalTrackpoints = 0;

    for (const activity of activityArray) {

      const laps = Array.isArray(activity.Lap)
        ? activity.Lap
        : [activity.Lap];

      for (const lap of laps) {

        const tracks = Array.isArray(lap.Track)
          ? lap.Track
          : [lap.Track];

        for (const track of tracks) {

          const trackpoints = Array.isArray(track.Trackpoint)
            ? track.Trackpoint
            : [track.Trackpoint];

          for (const point of trackpoints) {

            totalTrackpoints++;

            if (!point?.Time) continue;
            if (!point?.HeartRateBpm?.Value) continue;

            const rawTimestamp = new Date(point.Time);
            const offsetMs = 330  * 60 * 1000;
            const timestamp = new Date(
            rawTimestamp.getTime() + offsetMs
            );


            if (
            timestamp < startTime ||
            timestamp > endTime
            ) {
            continue;
            }

            const heartRate =
              Number(point.HeartRateBpm.Value);

            if (
              Number.isNaN(heartRate) ||
              heartRate <= 0
            ) {
              continue;
            }

            normalizedReadings.push({
              meta: {
                sessionId: meta.sessionId,
                userId: meta.userId,
                deviceType: "fitbit air",
                activityType: meta.activityType,
                bandPosition: meta.bandPosition,
                firmwareVersion: meta.firmwareVersion,
              },

              timestamp,

              metrics: {
                heartRate,
              },

              isValid: true,
            });
          }
        }
      }
    }

    normalizedReadings.sort(
      (a, b) =>
        a.timestamp.getTime() -
        b.timestamp.getTime()
    );

    console.log(`🏃 Total Trackpoints: ${totalTrackpoints}`);
    console.log(
      `🏃 Parsed HR Readings: ${normalizedReadings.length}`
    );

    if (normalizedReadings.length > 0) {

      const hrValues =
        normalizedReadings.map(
          r => r.metrics.heartRate as number
        );

      console.log(
        `🏃 First: ${normalizedReadings[0].timestamp.toISOString()}`
      );

      console.log(
        `🏃 Last: ${normalizedReadings[
          normalizedReadings.length - 1
        ].timestamp.toISOString()}`
      );

      console.log(
        `🏃 HR Range: ${Math.min(...hrValues)} - ${Math.max(...hrValues)}`
      );
    }

    console.log('🏃 ========================================\n');

    return normalizedReadings;

  } catch (err) {

    console.error('❌ Failed parsing TCX file:', err);

    throw new Error(
      `Failed to parse TCX file: ${
        err instanceof Error
          ? err.message
          : 'Unknown error'
      }`
    );
  }
}