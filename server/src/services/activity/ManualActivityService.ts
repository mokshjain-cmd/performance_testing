    // services/activity/ManualActivityService.ts

    import { Types } from "mongoose";
    import Session from "../../models/Session";
    import ActivityDailyReading from "../../models/ActivityDailyReading";

    export interface IManualActivityTotals {
    steps?: number;
    distanceMeters?: number;
    caloriesTotal?: number;
    caloriesActive?: number;
    caloriesBasal?: number;
    }

    export interface IManualActivityPayload {
    luna?: IManualActivityTotals;
    benchmark?: IManualActivityTotals;
    }

    export class ManualActivityService {
    /**
     * Insert manually entered activity readings
     */
    static async insertManualActivityReadings(
        sessionId: Types.ObjectId | string,
        userId: Types.ObjectId | string,
        activityDate: Date,
        manualActivityData: IManualActivityPayload,
        benchmarkDeviceType?: string
    ): Promise<void> {
        try {
        console.log("\n✍️ ========================================");
        console.log("✍️ MANUAL ACTIVITY INGESTION STARTED");
        console.log("✍️ ========================================\n");

        const session = await Session.findById(sessionId);

        if (!session) {
            throw new Error("Session not found");
        }

        const docs: any[] = [];

        /**
         * LUNA
         */
        if (manualActivityData.luna) {
            const lunaDevice = session.devices.find(
            (d: any) => d.deviceType === "luna"
            );

            docs.push({
            meta: {
                sessionId,
                userId,
                deviceType: "luna",
                firmwareVersion: lunaDevice?.firmwareVersion,
                date: activityDate,
            },

            totals: {
                steps: manualActivityData.luna.steps || 0,
                distanceMeters:
                manualActivityData.luna.distanceMeters || 0,
                caloriesTotal:
                manualActivityData.luna.caloriesTotal || 0,
                caloriesActive:
                manualActivityData.luna.caloriesActive || 0,
                caloriesBasal:
                manualActivityData.luna.caloriesBasal || 0,
            },

            source: "manual",
            });
        }

        /**
         * BENCHMARK
         */
        if (
            benchmarkDeviceType &&
            manualActivityData.benchmark
        ) {
            const benchmarkDevice = session.devices.find(
            (d: any) => d.deviceType === benchmarkDeviceType
            );

            docs.push({
            meta: {
                sessionId,
                userId,
                deviceType: benchmarkDeviceType,
                firmwareVersion:
                benchmarkDevice?.firmwareVersion,
                date: activityDate,
            },

            totals: {
                steps:
                manualActivityData.benchmark.steps || 0,

                distanceMeters:
                manualActivityData.benchmark
                    .distanceMeters || 0,

                caloriesTotal:
                manualActivityData.benchmark
                    .caloriesTotal || 0,

                caloriesActive:
                manualActivityData.benchmark
                    .caloriesActive || 0,

                caloriesBasal:
                manualActivityData.benchmark
                    .caloriesBasal || 0,
            },

            source: "manual",
            });
        }

        if (docs.length === 0) {
            throw new Error(
            "No valid manual activity data provided"
            );
        }

        await ActivityDailyReading.insertMany(docs);

        console.log(
            `✅ Inserted ${docs.length} manual activity reading documents`
        );

        console.log("\n✍️ ========================================");
        console.log("✍️ MANUAL ACTIVITY INGESTION COMPLETED");
        console.log("✍️ ========================================\n");
        } catch (error) {
        console.error(
            "[ManualActivityService] Error inserting manual activity readings:",
            error
        );

        throw error;
        }
    }
    }