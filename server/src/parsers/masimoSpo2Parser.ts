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
 * Parse Masimo SPO2 CSV file
 * Expected columns: Session, Index, Timestamp, Date, Time, O2 Saturation, Pulse Rate, Perfusion Index
 * Uses Date ("Wednesday, 1 April 2026") and Time ("1:48:01 PM India Standard Time") columns for timestamp
 * O2 Saturation is the SPO2 value (can be "--" for missing)
 * Perfusion Index can be used as quality indicator
 * @param filePath - Path to the Masimo CSV file
 * @param meta - Session metadata
 * @param startTime - Session start time
 * @param endTime - Session end time
 * @returns Array of normalized SPO2 readings
 */
export async function parseMasimoSpo2Csv(
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
    console.log("📌 Starting Masimo SPO2 CSV Parsing...");
    console.log("📂 File Path:", filePath);
    console.log("🕒 Start Time:", startTime.toISOString());
    console.log("🕒 End Time:", endTime.toISOString());
    console.log("===============================\n");

    const normalized: NormalizedReadingInput[] = [];

    let totalRows = 0;
    let acceptedRows = 0;
    let skippedRows = 0;
    let invalidTimestampRows = 0;
    let invalidSpo2Rows = 0;

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("headers", (headers: string[]) => {
        console.log("📌 CSV Headers Found:", headers);
      })
      .on("data", (row: any) => {
        totalRows++;

        try {
          // Parse Date and Time columns directly (more reliable than Unix timestamp with TZ offset)
          // Date format: "Wednesday, 1 April 2026"
          // Time format: "1:48:01 PM India Standard Time"
          const dateRaw = row["Date"];
          const timeRaw = row["Time"];
          
          if (!dateRaw || !timeRaw || dateRaw === "--" || timeRaw === "--") {
            invalidTimestampRows++;
            skippedRows++;
            return;
          }

          // Extract date parts: "Wednesday, 1 April 2026" -> "1 April 2026"
          const datePart = dateRaw.split(", ")[1]; // "1 April 2026"
          
          // Extract time parts: "1:48:01 PM India Standard Time" -> "1:48:01 PM"
          const timePart = timeRaw.replace(" India Standard Time", "").trim();
          
          // Parse and force timezone interpretation as UTC (ignore IST label)
          // User enters times like "1:48 PM" and expects them to be treated as "13:48 UTC"
          const combinedDateTime = `${datePart} ${timePart}`;
          const localDate = new Date(combinedDateTime);
          
          // Convert local time components to UTC by forcing UTC interpretation
          const timestamp = new Date(Date.UTC(
            localDate.getFullYear(),
            localDate.getMonth(),
            localDate.getDate(),
            localDate.getHours(),
            localDate.getMinutes(),
            localDate.getSeconds()
          ));

          // Debug: Log first 3 parsed timestamps for comparison
          if (totalRows <= 3) {
            console.log(`🔍 Row ${totalRows}: dateRaw="${dateRaw}", timeRaw="${timeRaw}"`);
            console.log(`   Combined: "${combinedDateTime}"`);
            console.log(`   Parsed timestamp: ${timestamp.toISOString()}`);
            console.log(`   Range: ${startTime.toISOString()} - ${endTime.toISOString()}`);
            console.log(`   In range? ${timestamp >= startTime && timestamp <= endTime}`);
          }

          if (isNaN(timestamp.getTime())) {
            invalidTimestampRows++;
            skippedRows++;
            console.log("⚠️ Invalid date/time:", dateRaw, timeRaw);
            return;
          }

          // Filter by time range
          if (timestamp < startTime || timestamp > endTime) {
            skippedRows++;
            return;
          }

          // Parse O2 Saturation (SPO2)
          const spo2Raw = row["O2 Saturation"];
          
          if (!spo2Raw || spo2Raw === "--") {
            invalidSpo2Rows++;
            skippedRows++;
            return;
          }

          const spo2 = parseFloat(spo2Raw);

          if (isNaN(spo2)) {
            invalidSpo2Rows++;
            skippedRows++;
            console.log("⚠️ Invalid SPO2 value:", spo2Raw, "at timestamp:", timestamp.toISOString());
            return;
          }

          // Validate SPO2 is in valid range (0-100)
          if (spo2 < 0 || spo2 > 100) {
            invalidSpo2Rows++;
            skippedRows++;
            console.log("⚠️ SPO2 out of range:", spo2, "at timestamp:", timestamp.toISOString());
            return;
          }

          // Parse Perfusion Index as quality indicator (optional)
          const perfusionIndexRaw = row["Perfusion Index"];
          let perfusionIndex = 0;
          
          if (perfusionIndexRaw && perfusionIndexRaw !== "--") {
            perfusionIndex = parseFloat(perfusionIndexRaw);
            if (isNaN(perfusionIndex)) {
              perfusionIndex = 0;
            }
          }

          // Consider reading valid if perfusion index is present and > 0
          // or if perfusion index is not available, accept the reading
          const isValid = perfusionIndex > 0 || perfusionIndexRaw === "--";

          acceptedRows++;

          normalized.push({
            meta: {
              sessionId: meta.sessionId,
              userId: meta.userId,
              deviceType: "masimo",
              activityType: meta.activityType,
              bandPosition: meta.bandPosition,
              firmwareVersion: meta.firmwareVersion,
            },
            timestamp: timestamp,
            metrics: {
              spo2: spo2,
            },
            isValid: isValid,
          });

          // Print first few rows for sanity check
          if (acceptedRows <= 5) {
            console.log(
              `✅ Row ${totalRows} accepted: ts=${timestamp.toISOString()}, spo2=${spo2}, perfusionIndex=${perfusionIndex}`
            );
          }
        } catch (err) {
          skippedRows++;
          console.log("⚠️ Error parsing row:", err);
          return;
        }
      })
      .on("end", () => {
        console.log("\n===============================");
        console.log("📌 Masimo SPO2 CSV Parsing Finished!");
        console.log("===============================");
        console.log("📌 Total Rows Read:", totalRows);
        console.log("📌 Accepted Rows:", acceptedRows);
        console.log("📌 Skipped Rows:", skippedRows);
        console.log("📌 Invalid Timestamp Rows:", invalidTimestampRows);
        console.log("📌 Invalid SPO2 Rows:", invalidSpo2Rows);
        console.log("📌 Final Normalized Points:", normalized.length);

        if (normalized.length > 0) {
          console.log("📌 First Normalized Point:", normalized[0]);
          console.log("📌 Last Normalized Point:", normalized[normalized.length - 1]);
        }

        console.log("===============================\n");

        resolve(normalized);
      })
      .on("error", (error) => {
        console.error("❌ Error parsing Masimo SPO2 CSV:", error);
        reject(error);
      });
  });
}
