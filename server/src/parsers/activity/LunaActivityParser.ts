import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Luna activity hourly data
 */
export interface ILunaActivityHourlyData {
  steps?: number[];
  distanceMeters?: number[];
  caloriesTotal?: number[];
  caloriesActive?: number[];
  caloriesBasal?: number[];
}

export interface ILunaActivityDailyTotals {
  date: Date;
  steps: number;
  distanceMeters: number;
  caloriesTotal: number | null;
  caloriesActive: number | null;
  caloriesBasal: number | null;
  hourly?: ILunaActivityHourlyData;
}

export interface ILunaActivityParseResult {
  dailyTotals: ILunaActivityDailyTotals[];
  metadata?: {
    deviceId?: string;
    firmwareVersion?: string;
    recordedAt?: string;
  };
}

export class LunaActivityParser {
  static async parseLunaActivityFile(
    filePath: string
  ): Promise<ILunaActivityParseResult> {
    console.log(`[LunaActivityParser] Parsing file: ${filePath}`);

    const dailyTotals: ILunaActivityDailyTotals[] = [];

    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let isHeader = true;

      for await (const line of rl) {
        if (!line.trim()) continue;

        if (isHeader) {
          isHeader = false;
          continue;
        }

        const parts = line.split(',').map(p => p.trim());

        if (parts.length >= 6) {
          try {
            const date = new Date(parts[0]);

            const steps = parseInt(parts[1], 10);
            const distanceMeters = parseFloat(parts[2]);
            const caloriesTotal = parseFloat(parts[3]);
            const caloriesActive = parseFloat(parts[4]);
            const caloriesBasal = parseFloat(parts[5]);

            if (!isNaN(date.getTime())) {
              dailyTotals.push({
                date,
                steps,
                distanceMeters,
                caloriesTotal,
                caloriesActive,
                caloriesBasal,
              });
            }
          } catch {}
        }
      }

      return {
        dailyTotals,
        metadata: {},
      };
    } catch (error) {
      throw new Error(`Failed to parse Luna activity file: ${error}`);
    }
  }

  static async parseLunaActivityFileAndroid(
    filePath: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ILunaActivityParseResult> {
    const result = await this.parseLunaActivityFile(filePath);

    if (startDate && endDate) {
      const targetDateStr = this.formatLocalDate(startDate);

      result.dailyTotals = result.dailyTotals.filter(daily => {
        return this.formatLocalDate(daily.date) === targetDateStr;
      });
    }

    return result;
  }

  static async parseLunaActivityFileIOS(
    filePath: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ILunaActivityParseResult> {
    console.log(`[LunaActivityParser iOS] Parsing file: ${filePath}`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      const entries: any[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        if (!line.includes('<DailyData> Obtained daily data:')) {
          i++;
          continue;
        }

        const entry: any = {
          date: null,
          dateStamp: null,
          steps: 0,
          distance: 0,
          calories: 0,
          todaySportCalorieData: 0,
          stepStr: [],
          distanceStr: [],
          caloriespStr: [],
          todaySportCalorie: [],
        };

        const timestampMatch = line.match(/LOG:\s+(.+?)\s+:/);
        if (timestampMatch) {
          entry.timestamp = timestampMatch[1];
        }

        i++;

        while (i < lines.length && !lines[i].startsWith('LOG:')) {
          const dataLine = lines[i].trim();

          const getVal = (prefix: string) =>
            dataLine.substring(prefix.length).trim();

          if (dataLine.startsWith('distance:')) {
            entry.distance = parseInt(getVal('distance:'), 10) || 0;
          }

          else if (dataLine.startsWith('step:')) {
            entry.steps = parseInt(getVal('step:'), 10) || 0;
          }

          else if (dataLine.startsWith('calories:')) {
            entry.calories = parseInt(getVal('calories:'), 10) || 0;
          }

          else if (dataLine.startsWith('dateStamp:')) {
            entry.dateStamp = parseInt(getVal('dateStamp:'), 10);

            const date = new Date(entry.dateStamp * 1000);
            entry.date = this.formatUTCDate(date);
            console.log('RAW dateStamp', entry.dateStamp);
            console.log('PARSED entry.date', entry.date);
          }

          else if (dataLine.startsWith('todaySportCalorieData:')) {
            entry.todaySportCalorieData =
              parseInt(getVal('todaySportCalorieData:'), 10) || 0;
          }

          else if (dataLine.startsWith('stepStr:')) {
            entry.stepStr = this.parseArrayString(getVal('stepStr:'));
          }

          else if (dataLine.startsWith('distanceStr:')) {
            entry.distanceStr = this.parseArrayString(getVal('distanceStr:'));
          }

          else if (dataLine.startsWith('caloriespStr:')) {
            entry.caloriespStr = this.parseArrayString(getVal('caloriespStr:'));
          }

          else if (dataLine.startsWith('todaySportCalorie:')) {
            entry.todaySportCalorie =
              this.parseArrayString(getVal('todaySportCalorie:'));
          }

          i++;
        }

        if (entry.date) {
          entries.push(entry);
        }
      }

      console.log(`[LunaActivityParser iOS] Extracted ${entries.length} entries`);

      let filteredEntries = entries;

      if (startDate && endDate) {
        const targetDateStr = this.formatLocalDate(startDate);

        filteredEntries = entries.filter(e => e.date === targetDateStr);

        console.log(
          `[LunaActivityParser iOS] Filtered ${filteredEntries.length} for ${targetDateStr}`
        );
      }

      const dateMap = new Map<string, any>();

      for (const entry of filteredEntries) {
        dateMap.set(entry.date, entry);
      }

      const dailyTotals: ILunaActivityDailyTotals[] = [];

      for (const [dateStr, entry] of dateMap.entries()) {
        dailyTotals.push({
          date: new Date(dateStr),
          steps: entry.steps,
          distanceMeters: entry.distance,
          caloriesTotal: entry.calories || null,
          caloriesActive: entry.todaySportCalorieData || null,
          caloriesBasal: null,

          hourly: {
            steps: entry.stepStr,
            distanceMeters: entry.distanceStr,
            caloriesTotal: entry.caloriespStr,
            caloriesActive: entry.todaySportCalorie,
          },
        });
      }

      return {
        dailyTotals,
        metadata: {
          recordedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse Luna iOS activity file: ${error}`);
    }
  }

  private static parseArrayString(str: string): number[] {
    if (!str) return [];

    return str
      .split(',')
      .map(v => parseInt(v.trim(), 10))
      .filter(v => !isNaN(v));
  }

  private static formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

private static formatUTCDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}
}