import fs from "fs";
import csvParser from "csv-parser";

type NormalizedReadingInput = {
  meta: {
    sessionId: any;
    userId: any;
    deviceType: string;
    firmwareVersion?: string;
    activityType: string;
    bandPosition?: string;
  };
  timestamp: Date;
  metrics: {
    spo2?: number | null;
  };
  isValid: boolean;
};

/**
 * Parse local datetime string to UTC Date
 * Format: "YYYY-MM-DD HH:MM:SS" or "HH:MM:SS"
 */
function parseLocalDateTime(dateTimeStr: string): Date {
  const [datePart, timePart] = dateTimeStr.split(" ");
  if (!datePart || !timePart) {
    throw new Error(`Invalid datetime format: ${dateTimeStr}`);
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = "0"] = timePart.split(":");

  // Create UTC date to match how startTime/endTime are parsed
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ));
}

/**
 * Parse Luna SPO2 CSV file
 * Expected columns: SySTime, Spo2_Qi, Spo2, etc.
 * @param filePath - Path to the Luna SPO2 CSV file
 * @param meta - Session metadata
 * @param startTime - Session start time
 * @param endTime - Session end time
 * @returns Array of normalized SPO2 readings
 */
export async function parseLunaSpo2Csv(
  filePath: string,
  meta: {
    activityType: string;
    bandPosition?: string;
    sessionId: any;
    userId: any;
    firmwareVersion?: string;
  },
  startTime: Date,
  endTime: Date
): Promise<NormalizedReadingInput[]> {
  return new Promise((resolve, reject) => {
    console.log("\n===============================");
    console.log("📌 Starting Luna SPO2 CSV Parsing...");
    console.log("📂 File Path:", filePath);
    console.log("🕒 Start Time:", startTime.toISOString());
    console.log("🕒 End Time:", endTime.toISOString());
    console.log("===============================\n");

    const perSecondMapWithQI = new Map<number, { spo2: number | null; qi: number }[]>();
    let timestampCol: string | null = null;

    let totalRows = 0;
    let skippedRows = 0;
    let inRangeRows = 0;
    let invalidTimestampRows = 0;
    let invalidSpo2Rows = 0;

    // Always use the date from startTime for all rows that only have a time
    const fileDate = startTime.toISOString().split("T")[0];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("headers", (headers: string[]) => {
        // Look for timestamp column
        for (const col of headers) {
          if (col.toLowerCase().includes("time")) {
            timestampCol = col;
            break;
          }
        }

        if (!timestampCol) {
          reject(new Error("No timestamp column found in Luna SPO2 CSV"));
        }
      })
      .on("data", (row: any) => {
        totalRows++;

        try {
          if (!timestampCol) {
            skippedRows++;
            return;
          }

          const tsRaw = row[timestampCol];

          if (!tsRaw || tsRaw.includes("====")) {
            skippedRows++;
            return;
          }

          let tsFull = tsRaw;

          // If only time exists (HH:MM:SS) prepend fileDate
          if (tsRaw.length <= 8 && tsRaw.includes(":")) {
            tsFull = `${fileDate} ${tsRaw}`;
          }

          const ts = parseLocalDateTime(tsFull);

          if (isNaN(ts.getTime())) {
            invalidTimestampRows++;
            skippedRows++;
            console.log("⚠️ Invalid timestamp found:", tsFull);
            return;
          }

          // Filter only required range
          if (ts < startTime || ts > endTime) {
            skippedRows++;
            return;
          }

          inRangeRows++;

          // Round to second
          ts.setMilliseconds(0);

          const epochSec = Math.floor(ts.getTime() / 1000);

          // Parse SPO2 and Spo2_Qi
          const spo2Raw = row["Spo2"];
          const qiRaw = row["Spo2_Qi"];

          if (!spo2Raw) {
            invalidSpo2Rows++;
            skippedRows++;
            return;
          }

          let spo2: number | null = parseFloat(spo2Raw);
          let qi: number = qiRaw ? parseFloat(qiRaw) : 0;

          if (isNaN(spo2)) {
            invalidSpo2Rows++;
            skippedRows++;
            console.log("⚠️ Invalid SPO2 found:", spo2Raw, "at timestamp:", tsFull);
            return;
          }

          if (isNaN(qi)) {
            qi = 0; // Default to 0 if QI is invalid
          }

          // Mark as invalid if Spo2_Qi == 0 or SPO2 is out of valid range (0-100)
          if (qi === 0 || spo2 < 0 || spo2 > 100) {
            spo2 = null;
          }

          if (!perSecondMapWithQI.has(epochSec)) {
            perSecondMapWithQI.set(epochSec, []);
          }

          perSecondMapWithQI.get(epochSec)!.push({ spo2, qi });

          // Print first few rows for sanity check
          if (inRangeRows <= 5) {
            console.log(
              `✅ Row ${totalRows} accepted: ts=${ts.toISOString()}, spo2=${spo2}, qi=${qi}`
            );
          }
        } catch (err) {
          skippedRows++;
          return;
        }
      })
      .on("end", () => {
        console.log("\n===============================");
        console.log("📌 Luna SPO2 CSV Parsing Finished!");
        console.log("===============================");
        console.log("📌 Total Rows Read:", totalRows);
        console.log("📌 Rows In Range:", inRangeRows);
        console.log("📌 Skipped Rows:", skippedRows);
        console.log("📌 Invalid Timestamp Rows:", invalidTimestampRows);
        console.log("📌 Invalid SPO2 Rows:", invalidSpo2Rows);
        console.log("📌 Unique Seconds Buckets:", perSecondMapWithQI.size);

        const normalized: NormalizedReadingInput[] = [];

        const sortedKeys = Array.from(perSecondMapWithQI.keys()).sort((a, b) => a - b);

        for (const epochSec of sortedKeys) {
          // Get all readings for this second
          const readings = perSecondMapWithQI.get(epochSec)!;

          // Filter valid readings (where spo2 is not null)
          const validReadings = readings.filter((r) => r.spo2 !== null && r.qi > 0);

          let avg: number | null = null;

          if (validReadings.length > 0) {
            // Calculate weighted average using Spo2_Qi as weights
            const totalWeight = validReadings.reduce((sum, r) => sum + r.qi, 0);

            if (totalWeight > 0) {
              const weightedSum = validReadings.reduce((sum, r) => sum + r.spo2! * r.qi, 0);
              avg = weightedSum / totalWeight;
            } else {
              // Fallback to simple average if all weights are 0
              avg = validReadings.reduce((sum, r) => sum + r.spo2!, 0) / validReadings.length;
            }
          }

          normalized.push({
            meta: {
              sessionId: meta.sessionId,
              userId: meta.userId,
              deviceType: "luna",
              activityType: meta.activityType,
              bandPosition: meta.bandPosition,
              firmwareVersion: meta.firmwareVersion,
            },
            timestamp: new Date(epochSec * 1000),
            metrics: {
              spo2: avg !== null ? Math.round(avg * 100) / 100 : null,
            },
            isValid: true,
          });
        }

        console.log("\n===============================");
        console.log("✅ Normalization Completed");
        console.log("===============================");
        console.log("📌 Final Normalized Points:", normalized.length);

        if (normalized.length > 0) {
          console.log("📌 First Normalized Point:", normalized[0]);
          console.log("📌 Last Normalized Point:", normalized[normalized.length - 1]);
        }

        console.log("===============================\n");

        resolve(normalized);
      })
      .on("error", (err: any) => {
        console.log("❌ CSV Stream Error:", err);
        reject(err);
      });
  });
}
