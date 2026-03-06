import fs from "fs";

type NormalizedReadingInput = {
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
    heartRate?: number;
  };
  isValid: boolean;
};

function parseElapsedTimeToSeconds(timeStr: string): number | null {
  const parts = timeStr.split(":").map((x) => x.trim());

  if (parts.length !== 3) return null;

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseInt(parts[2]);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

export async function parsePolarCsv(
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
  console.log("\n===============================");
  console.log("📌 Starting Polar CSV Parsing...");
  console.log("📂 File:", filePath);
  console.log("🕒 Start Time:", startTime.toISOString());
  console.log("🕒 End Time:", endTime.toISOString());
  console.log("===============================\n");

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  // Find where data starts
  let dataStartIdx: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Sample rate,Time,HR (bpm)")) {
      dataStartIdx = i;
      break;
    }
  }

  if (dataStartIdx === null) {
    throw new Error("Could not find data section in Polar CSV");
  }

  //console.log("📌 Data starts at line index:", dataStartIdx);

  // Extract metadata date + start time (line 0 = headers, line 1 = values)
  let baseDatetime = new Date();

  if (lines.length > 1) {
    const headers = lines[0].split(",");
    const values = lines[1].split(",");

    let dateStr: string | null = null;
    let startTimeStr: string | null = null;

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim();

      if (header === "Date" && i < values.length) {
        dateStr = values[i].trim();
      }

      if (header === "Start time" && i < values.length) {
        startTimeStr = values[i].trim();
      }
    }

    if (dateStr && startTimeStr) {
      let dd: number, mm: number, yyyy: number;

      // Normalize separator
      const normalizedDate = dateStr.replace(/\//g, "-");

      const parts = normalizedDate.split("-").map((x) => parseInt(x));

      if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }

      // Detect format
      if (parts[0] > 1900) {
        // YYYY-MM-DD
        [yyyy, mm, dd] = parts;
      } else {
        // DD-MM-YYYY
        [dd, mm, yyyy] = parts;
      }

      const [hh, min, sec] = startTimeStr.split(":").map((x) => parseInt(x));

      if (
        !isNaN(dd) &&
        !isNaN(mm) &&
        !isNaN(yyyy) &&
        !isNaN(hh) &&
        !isNaN(min) &&
        !isNaN(sec)
      ) {
        if (process.env.ENV === "production") {
          baseDatetime = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, sec));
        } else {
          baseDatetime = new Date(yyyy, mm - 1, dd, hh + 5, min + 30, sec);
        }
      }
    }
  }

  //console.log("📌 Base Datetime Detected:", baseDatetime.toISOString());

  // Data lines (including header row)
  const dataLines = lines.slice(dataStartIdx);

  const headerRow = dataLines[0].split(",").map((x) => x.trim());

  const timeIndex = headerRow.indexOf("Time");
  const hrIndex = headerRow.indexOf("HR (bpm)");

  if (timeIndex === -1 || hrIndex === -1) {
    throw new Error("Polar CSV missing Time or HR (bpm) column");
  }

  console.log("📌 Time column index:", timeIndex);
  console.log("📌 HR column index:", hrIndex);

  const normalized: NormalizedReadingInput[] = [];

  let totalRows = 0;
  let acceptedRows = 0;
  let skippedRows = 0;

  for (let i = 1; i < dataLines.length; i++) {
    const row = dataLines[i].trim();
    if (!row) continue;

    totalRows++;

    const cols = row.split(",");

    const timeStr = cols[timeIndex]?.trim();
    const hrStr = cols[hrIndex]?.trim();

    if (!timeStr || !hrStr) {
      skippedRows++;
      continue;
    }

    const elapsedSeconds = parseElapsedTimeToSeconds(timeStr);
    if (elapsedSeconds === null) {
      skippedRows++;
      continue;
    }

    const hr = parseFloat(hrStr);
    if (isNaN(hr)) {
      skippedRows++;
      continue;
    }

    const ts = new Date(baseDatetime.getTime() + elapsedSeconds * 1000);

    // Filter session range
    if (ts < startTime || ts > endTime) {
      skippedRows++;
      continue;
    }

    acceptedRows++;

    normalized.push({
      meta: {
        sessionId: meta.sessionId,
        userId: meta.userId,
        deviceType: "polar",
        activityType: meta.activityType,
        bandPosition: meta.bandPosition,
        firmwareVersion: meta.firmwareVersion,
      },
      timestamp: ts,
      metrics: {
        heartRate: Math.round(hr * 100) / 100,
      },
      isValid: true,
    });

    // Debug first few
    if (acceptedRows <= 5) {
      //console.log(`✅ Accepted: ts=${ts.toISOString()} hr=${hr}`);
    }
  }

  console.log("\n===============================");
  console.log("📌 Polar Parsing Completed");
  console.log("===============================");
  console.log("📌 Total Rows Read:", totalRows);
  console.log("📌 Accepted Rows:", acceptedRows);
  console.log("📌 Skipped Rows:", skippedRows);
  console.log("📌 Final Normalized Points:", normalized.length);

  if (normalized.length > 0) {
    console.log("📌 First Point:", normalized[0]);
    console.log("📌 Last Point:", normalized[normalized.length - 1]);
  }

  console.log("===============================\n");

  return normalized;
}
