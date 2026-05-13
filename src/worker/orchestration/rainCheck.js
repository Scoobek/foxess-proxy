/**
 * Sprawdzanie czy deszcz jest spodziewany w najbliższych godzinach
 */

import { fetchWeather } from "../services/openMeteoService.js";
import { toLocalString } from "../../shared/utils/time.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("rainCheck");

const RAIN_PROBABILITY_THRESHOLD = 50;

export async function checkRainExpected(hoursAhead = 3) {
    const result = await fetchWeather();

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const { hourly } = result;
    const currentHour = toLocalString().slice(0, 13).replace(" ", "T");
    const currentIndex = hourly.time.findIndex((t) =>
        t.startsWith(currentHour)
    );

    if (currentIndex === -1) {
        log.warn("Nie znaleziono bieżącej godziny w danych godzinowych");
        return { success: false, error: "Hour not found in forecast" };
    }

    const upcoming = hourly.precipitation_probability.slice(
        currentIndex,
        currentIndex + hoursAhead
    );
    const maxProbability = Math.max(...upcoming);
    const isRainExpected = maxProbability > RAIN_PROBABILITY_THRESHOLD;

    log.debug(
        { isRainExpected, maxProbability, hoursAhead },
        "Sprawdzono prognozę deszczu"
    );

    return { success: true, isRainExpected, maxProbability };
}
