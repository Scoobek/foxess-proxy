/**
 * Bojler - harmonogram dzienny (planDay)
 * Interfejs device registry: { initDevice, planDay }
 */

import {
    initBojlerState,
    ensureBojlerOff,
    handleBojlerAutoControl,
} from "./index.js";
import {
    startPolling,
    stopPolling,
} from "../../worker/managers/pollingManager.js";
import { refreshRealtimeData } from "../../worker/managers/foxessDataManager.js";
import { updateDeviceState } from "../../shared/state.js";
import { createLogger } from "../../shared/logger.js";
import {
    SUNRISE_OFFSET_MINUTES,
    POLLING_INTERVAL_MS,
} from "../../config/index.js";
import {
    formatMinutesAsTime,
    msUntilMinutes,
    calcNextPollAt,
} from "../../shared/utils/time.js";

const log = createLogger("bojler");

export { initBojlerState as initDevice };

export async function planDay(sunriseMin, sunsetMin, nowMin) {
    const startMin = sunriseMin + SUNRISE_OFFSET_MINUTES;
    const pollingStartsAt = formatMinutesAsTime(startMin);
    const pollingStopsAt = formatMinutesAsTime(sunsetMin);

    log.info(
        {
            startPolling: pollingStartsAt,
            stopPolling: pollingStopsAt,
            offsetMinutes: SUNRISE_OFFSET_MINUTES,
        },
        "[bojler] Planowanie"
    );

    const pollFn = async () => {
        const result = await refreshRealtimeData();
        if (
            result.success &&
            result.data?.errno === 0 &&
            result.data?.result?.[0]?.datas
        ) {
            await handleBojlerAutoControl(result.data.result[0].datas);
        }
        updateDeviceState("bojler", {
            nextPollAt: calcNextPollAt(POLLING_INTERVAL_MS),
        });
    };

    const doStart = () => {
        updateDeviceState("bojler", {
            isPolling: true,
            pollingStartsAt: null,
            nextPollAt: calcNextPollAt(POLLING_INTERVAL_MS),
        });
        startPolling(pollFn);
    };

    const doStop = () => {
        log.info("[bojler] Sunset - zatrzymuję polling");
        stopPolling();
        updateDeviceState("bojler", {
            isPolling: false,
            pollingStopsAt: null,
            nextPollAt: null,
        });
    };

    let startTimer = null;
    let stopTimer = null;

    if (nowMin >= startMin && nowMin < sunsetMin) {
        log.info("[bojler] W oknie aktywności - natychmiastowy start");
        updateDeviceState("bojler", { pollingStartsAt: null, pollingStopsAt });
        doStart();
        stopTimer = setTimeout(doStop, msUntilMinutes(sunsetMin));
        log.info(
            { minutesUntilStop: Math.round(msUntilMinutes(sunsetMin) / 60000) },
            "[bojler] Stop timer zaplanowany"
        );
    } else if (nowMin < startMin) {
        updateDeviceState("bojler", { pollingStartsAt, pollingStopsAt });
        const msToStart = msUntilMinutes(startMin);
        const msToStop = msUntilMinutes(sunsetMin);
        startTimer = setTimeout(() => {
            log.info("[bojler] Sunrise + offset - uruchamiam polling");
            doStart();
        }, msToStart);
        stopTimer = setTimeout(doStop, msToStop);
        log.info(
            {
                minutesUntilStart: Math.round(msToStart / 60000),
                minutesUntilStop: Math.round(msToStop / 60000),
            },
            "[bojler] Timery zaplanowane"
        );
    } else {
        updateDeviceState("bojler", {
            pollingStartsAt: null,
            pollingStopsAt: null,
            nextPollAt: null,
        });
        await ensureBojlerOff("sunset");
        log.info("[bojler] Po sunset - polling nieaktywny do jutra");
    }

    return () => {
        if (startTimer) clearTimeout(startTimer);
        if (stopTimer) clearTimeout(stopTimer);
        stopPolling();
        updateDeviceState("bojler", {
            isPolling: false,
            nextPollAt: null,
            pollingStopsAt: null,
        });
    };
}
