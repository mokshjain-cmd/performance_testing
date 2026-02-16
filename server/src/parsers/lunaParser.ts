import fs from "fs";
import path from "path";
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
    heartRate?: number | null;
  };
  isValid: boolean;
};
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




export async function parseLunaCsv(
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
    console.log("📌 Starting Luna CSV Parsing...");
    console.log("📂 File Path:", filePath);
    console.log("🕒 Start Time:", startTime.toISOString());
    console.log("🕒 End Time:", endTime.toISOString());
    console.log("===============================\n");

    const perSecondMap = new Map<number, (number | null)[]>(); // key = epoch second, value = HR values list
    let timestampCol: string | null = null;

    let totalRows = 0;
    let skippedRows = 0;
    let inRangeRows = 0;
    let invalidTimestampRows = 0;
    let invalidHrRows = 0;


    // Always use the date from startTime for all rows that only have a time
    const fileDate = startTime.toISOString().split("T")[0];
    console.log("📌 Using date from startTime:", fileDate);

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

          // Parse HR
          const hrRaw = row["Hrs"];
          if (!hrRaw) {
            invalidHrRows++;
            skippedRows++;
            return;
          }



          let hr: number | null = parseFloat(hrRaw);
          if (isNaN(hr)) {
            invalidHrRows++;
            skippedRows++;
            console.log("⚠️ Invalid HR found:", hrRaw, "at timestamp:", tsFull);
            return;
          }
          // If HR is 255, treat as null (missing)
          if (hr === 255) hr = null;

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
          // Remove nulls before averaging
          const values = perSecondMap.get(epochSec)!.filter((v) => v !== null);
          let avg: number | null = null;
          if (values.length > 0) {
            avg = values.reduce((a, b) => a + b, 0) / values.length;
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
              heartRate: avg !== null ? Math.round(avg * 100) / 100 : null,
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
