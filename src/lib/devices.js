/**
 * Rejestr urządzeń — jedyne miejsce do edycji przy dodaniu nowego urządzenia.
 * Każdy wpis musi eksportować: initDevice(), planDay()
 */

import * as bojler from "./bojler/schedule.js";
import * as podswietlenieDomu from "./podswietlenieDomu/schedule.js";

export const devices = [bojler, podswietlenieDomu];
