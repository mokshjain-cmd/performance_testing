import { Request, Response } from "express";

import Session from "../models/Session";
import Device from "../models/Devices";
import NormalizedReading from "../models/NormalizedReadings";
import WorkoutReading from "../models/WorkoutReading";

export const SPORT_TYPE_NAMES: Record<number, string> = {
  // Generic
  0: "Workout",

  // Running
  1: "Outdoor Running",
  3: "Indoor Running",
  66: "Treadmill",
  139: "Marathon",
  206: "Indoor Running",
  207: "Outdoor Running",
  220: "Running",
  246: "Outdoor Running",
  247: "Indoor Running",

  // Walking
  2: "Outdoor Walking",
  135: "Indoor Walking",
  208: "Walking",
  251: "Outdoor Walking",

  // Hiking / Trekking
  4: "Trekking",
  5: "Trail Running",
  13: "Outdoor Hiking",
  229: "Hiking",
  249: "Hiking",
  252: "Trail Running",

  // Cycling
  6: "Outdoor Cycling",
  7: "Indoor Cycling",
  14: "BMX",
  124: "Mountain Cycling",
  209: "Indoor Cycling",
  210: "Outdoor Cycling",
  221: "Cycling",
  244: "Outdoor Cycling",
  245: "Indoor Cycling",
  253: "Spinning Bike",

  // Swimming
  21: "Pool Swimming",
  22: "Open Water",
  200: "Pool Swimming",
  219: "Swimming",
  248: "Swimming",

  // Gym / Fitness
  8: "Freestyle",
  23: "Core Training",
  25: "Strength Training",
  30: "Indoor Fitness",
  34: "Elliptical",
  64: "HIIT",
  84: "CrossFit",
  121: "Rowing Machine",
  122: "Rope Skipping",
  223: "HIIT",
  228: "Strength Training",

  // Yoga / Pilates
  28: "Pilates",
  35: "Yoga",
  215: "Yoga",
  233: "Pilates",
  266: "Yoga",

  // Ball Sports
  9: "Basketball",
  10: "Football",
  11: "Pingpong",
  12: "Badminton",
  39: "Cricket",
  105: "Tennis",
  134: "Golf",
  155: "Pickleball",
  211: "Badminton",
  212: "Tennis",
  213: "Soccer",
  214: "Cricket",
  230: "Basketball",
  256: "Golf",
  257: "Soccer",
  258: "Badminton",
  259: "Tennis",
  262: "Cricket",
  265: "Basketball",

  // Dancing
  47: "Ballet",
  52: "Dance",
  53: "Zumba",
  226: "Dance",
  227: "Zumba",

  // Martial Arts
  56: "Boxing",
  59: "Tai Chi",
  61: "Taekwondo",
  62: "Martial Arts",
  125: "Kickboxing",

  // Winter Sports
  126: "Skiing",
  128: "Snowboarding",

  // Triathlon
  123: "Triathlon",
  204: "Triathlon",
};
export const getHomeStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [
      totalSessions,
      totalWorkoutSessions,
      totalUsers,

      lunaNormalizedReadings,
      lunaWorkoutReadings,

      totalNormalizedReadings,
      totalWorkoutReadings,

      benchmarkDeviceTypes,

      firmwareVersions,

      durationAgg,

      workoutAgg,
    ] = await Promise.all([
      Session.countDocuments({ isValid: true }),

      Session.countDocuments({
        metric: "Workout",
        isValid: true,
      }),

      Session.distinct("userId").then((users) => users.length),

      NormalizedReading.countDocuments({
        "meta.deviceType": "luna",
      }),

      WorkoutReading.countDocuments({
        "meta.deviceType": "luna",
      }),

      NormalizedReading.estimatedDocumentCount(),

      WorkoutReading.estimatedDocumentCount(),

      Device.distinct("deviceType"),

      Device.distinct("firmwareVersion", {
        deviceType: "luna",
      }),

      Session.aggregate([
  {
    $match: {
      isValid: true,
      startTime: { $exists: true },
      endTime: { $exists: true },
    },
  },
  {
    $project: {
      durationSec: {
        $divide: [
          {
            $subtract: ["$endTime", "$startTime"],
          },
          1000,
        ],
      },
    },
  },
  {
    $match: {
      durationSec: { $gt: 0 },
    },
  },
  {
    $group: {
      _id: null,
      totalDurationSec: {
        $sum: "$durationSec",
      },
    },
  },
]),

      Session.aggregate([
        {
          $match: {
            metric: "Workout",
            sportType: {
              $exists: true,
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: "$sportType",
            sessions: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            sessions: -1,
          },
        },
      ]),
    ]);

    const totalLunaReadings =
      lunaNormalizedReadings +
      lunaWorkoutReadings;

    const totalReadings =
      totalNormalizedReadings +
      totalWorkoutReadings;

    const totalDurationSec =
      durationAgg?.[0]?.totalDurationSec || 0;

    const totalHoursTested = Number(
      (totalDurationSec / 3600).toFixed(1)
    );

    const totalDaysOfData = Number(
      (totalDurationSec / 86400).toFixed(1)
    );

    const benchmarkDevices = benchmarkDeviceTypes
      .filter(
        (device) =>
          device &&
          device.toLowerCase() !== "luna"
      )
      .sort();

    const cleanFirmwareVersions = firmwareVersions
      .filter(Boolean)
      .sort();

    const workouts = workoutAgg.map((workout) => ({
      sportType: workout._id,
      name:
        SPORT_TYPE_NAMES[workout._id] ??
        `Sport ${workout._id}`,
      sessions: workout.sessions,
    }));

    // Unique activity names (Outdoor Running, Cycling, etc.)
    const uniqueActivityNames = new Set(
      workouts.map((w) => w.name)
    );

    const latestFirmware =
      cleanFirmwareVersions.length > 0
        ? cleanFirmwareVersions[
            cleanFirmwareVersions.length - 1
          ]
        : null;

    res.status(200).json({
      success: true,
      data: {
        totalWorkoutSessions,
        totalSessions,
        totalUsers,

        totalLunaReadings,
        totalReadings,

        totalHoursTested,
        totalDaysOfData,

        totalFirmwareReleases:
          cleanFirmwareVersions.length,

        latestFirmware,

        totalDevicesBenchmarked:
          benchmarkDevices.length,

        benchmarkDevices,

        activitiesCovered:
          uniqueActivityNames.size,

        workouts,

        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Home stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch home statistics",
    });
  }
};