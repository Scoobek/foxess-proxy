/**
 * Weather Manager - zarządzanie danymi pogodowymi
 */

import { updateAppState } from "../../shared/state.js";
import { checkRainExpected } from "../orchestration/rainCheck.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("weatherManager");

export async function refreshWeatherData() {
    const result = await checkRainExpected();

    if (result.success) {
        updateAppState({
            weather: {
                isRainExpected: result.isRainExpected,
                maxProbability: result.maxProbability,
                lastCheck: new Date().toISOString(),
            },
        });
    }

    log.info(
        {
            isRainExpected: result.isRainExpected ?? "brak danych",
            maxProbability: result.maxProbability ?? "brak danych",
        },
        "Stan pogody"
    );

    return result;
}
