import fs from "fs";
import path from "path";
import csvParser from "csv-parser";

type NormalizedReadingInput = {
  meta: {
    sessionId: any;
    userId: any;
    deviceType: string;
    firmwareVersion?: string;
  };
  timestamp: Date;
  metrics: {
    heartRate?: number;
  };
  isValid: boolean;
};

export async function parseLunaCsv(
  filePath: string,
  meta: {
    sessionId: any;
    userId: any;
    firmwareVersion?: string;
  },
  startTime: Date,
  endTime: Date
): Promise<NormalizedReadingInput[]> {
  return new Promise((resolve, reject) => {
    console.log("\n===============================");
    console.log("📌 Starting Luna CSV Parsing...");
    console.log("📂 File Path:", filePath);
    console.log("🕒 Start Time:", startTime.toISOString());
    console.log("🕒 End Time:", endTime.toISOString());
    console.log("===============================\n");

    const perSecondMap = new Map<number, number[]>(); // key = epoch second, value = HR values list
    let timestampCol: string | null = null;

    let totalRows = 0;
    let skippedRows = 0;
    let inRangeRows = 0;
    let invalidTimestampRows = 0;
    let invalidHrRows = 0;

    // Extract date from filename (same regex logic as python)
    const fileName = path.basename(filePath);
    const match = fileName.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);

    let fileDate = "";
    if (match) {
      const yyyy = match[1];
      const mm = match[2].padStart(2, "0");
      const dd = match[3].padStart(2, "0");
      fileDate = `${yyyy}-${mm}-${dd}`;
    } else {
      fileDate = new Date().toISOString().split("T")[0];
    }

    console.log("📌 Extracted fileDate from filename:", fileDate);

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("headers", (headers: string[]) => {
        console.log("📌 CSV Headers Found:", headers);

        for (const col of headers) {
          if (col.toLowerCase().includes("time")) {
            timestampCol = col;
            break;
          }
        }

        console.log("📌 Detected Timestamp Column:", timestampCol);

        if (!timestampCol) {
          console.log("❌ No timestamp column detected!");
          reject(new Error("No timestamp column found in Luna CSV"));
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

          const ts = new Date(tsFull.replace(" ", "T"));

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

          // Parse HR
          const hrRaw = row["Hrs"];
          if (!hrRaw) {
            invalidHrRows++;
            skippedRows++;
            return;
          }

          const hr = parseFloat(hrRaw);
          if (isNaN(hr)) {
            invalidHrRows++;
            skippedRows++;
            console.log("⚠️ Invalid HR found:", hrRaw, "at timestamp:", tsFull);
            return;
          }

          if (!perSecondMap.has(epochSec)) {
            perSecondMap.set(epochSec, []);
          }

          perSecondMap.get(epochSec)!.push(hr);

          // Print first few rows for sanity check
          if (inRangeRows <= 5) {
            console.log(
              `✅ Row ${totalRows} accepted: ts=${ts.toISOString()}, hr=${hr}`
            );
          }
        } catch (err) {
          skippedRows++;
          return;
        }
      })
      .on("end", () => {
        console.log("\n===============================");
        console.log("📌 Luna CSV Parsing Finished!");
        console.log("===============================");
        console.log("📌 Total Rows Read:", totalRows);
        console.log("📌 Rows In Range:", inRangeRows);
        console.log("📌 Skipped Rows:", skippedRows);
        console.log("📌 Invalid Timestamp Rows:", invalidTimestampRows);
        console.log("📌 Invalid HR Rows:", invalidHrRows);
        console.log("📌 Unique Seconds Buckets:", perSecondMap.size);

        const normalized: NormalizedReadingInput[] = [];

        const sortedKeys = Array.from(perSecondMap.keys()).sort((a, b) => a - b);

        for (const epochSec of sortedKeys) {
          const values = perSecondMap.get(epochSec)!;

          const avg = values.reduce((a, b) => a + b, 0) / values.length;

          normalized.push({
            meta: {
              sessionId: meta.sessionId,
              userId: meta.userId,
              deviceType: "luna",
              firmwareVersion: meta.firmwareVersion,
            },
            timestamp: new Date(epochSec * 1000),
            metrics: {
              heartRate: Math.round(avg * 100) / 100,
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
