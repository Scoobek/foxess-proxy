/**
 * TuyAPI - komunikacja z urządzeniami Tuya
 * Hybrid connection - połączenie utrzymywane z idle timeout (5 min)
 * Auto-disconnect przy braku aktywności, reconnect przy błędach
 */

import TuyAPI from "tuyapi";
import {
    TUYA_CONNECT_TIMEOUT_MS,
    TUYA_IDLE_TIMEOUT_MS,
    TUYA_MAX_RETRIES,
    TUYA_OPERATION_TIMEOUT_MS,
    TUYA_RETRY_DELAY_MS,
} from "../config/index.js";
import { createLogger } from "../shared/logger.js";

/**
 * Klasa obsługująca urządzenie Tuya
 */
export class TuyaDevice {
    constructor({ id, key, version, name }) {
        this.name = name;
        this.log = createLogger(`tuya:${name}`);
        this.device = new TuyAPI({ id, key, version });
        this.isConnected = false;
        this.connectionPromise = null;
        this.idleTimer = null;

        this._setupListeners();
    }

    _setupListeners() {
        this.device.on("connected", () => {
            this.isConnected = true;
            this.log.info("Połączono z urządzeniem");
        });

        this.device.on("disconnected", () => {
            this.isConnected = false;
            this.connectionPromise = null;
            this.log.info("Rozłączono z urządzeniem");
        });

        this.device.on("error", (err) => {
            this.isConnected = false;
            this.connectionPromise = null;
            this.log.error({ err }, "Błąd urządzenia");
        });
    }

    _clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    _resetIdleTimer() {
        this._clearIdleTimer();
        this.idleTimer = setTimeout(() => {
            this.log.debug("Idle timeout - rozłączam");
            this._disconnect();
        }, TUYA_IDLE_TIMEOUT_MS);
    }

    _disconnect() {
        this._clearIdleTimer();
        this.isConnected = false;
        this.connectionPromise = null;
        try {
            this.device._disconnect();
        } catch {
            // ignoruj
        }
    }

    _withTimeout(promise, ms) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(
                () => reject(new Error("Operation timeout")),
                ms
            );
        });

        return Promise.race([promise, timeoutPromise]).finally(() => {
            clearTimeout(timeoutId);
        });
    }

    async _ensureConnected() {
        if (this.isConnected) return true;

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                await this.device.find({ timeout: TUYA_CONNECT_TIMEOUT_MS });
                await this.device.connect();
                this.connectionPromise = null;
                return true;
            } catch (err) {
                this.connectionPromise = null;
                throw err;
            }
        })();

        return this.connectionPromise;
    }

    async _withDevice(operation) {
        let lastError;

        for (let attempt = 1; attempt <= TUYA_MAX_RETRIES; attempt++) {
            try {
                await this._ensureConnected();
                const result = await this._withTimeout(
                    operation(),
                    TUYA_OPERATION_TIMEOUT_MS
                );
                this._resetIdleTimer();
                return { success: true, ...result };
            } catch (err) {
                lastError = err;
                this.log.warn(
                    {
                        error: err.message,
                        attempt,
                        maxRetries: TUYA_MAX_RETRIES,
                    },
                    "Błąd operacji - próba retry"
                );
                this._disconnect();

                if (attempt < TUYA_MAX_RETRIES) {
                    await new Promise((r) =>
                        setTimeout(r, TUYA_RETRY_DELAY_MS)
                    );
                }
            }
        }

        this.log.error(
            { error: lastError.message },
            "Błąd operacji po wszystkich próbach"
        );
        return { success: false, error: lastError.message };
    }

    async turnOn() {
        return this._withDevice(async () => {
            await this.device.set({ set: true });
            this.log.info("Urządzenie włączone");
            return { isOn: true };
        });
    }

    async turnOff() {
        return this._withDevice(async () => {
            await this.device.set({ set: false });
            this.log.info("Urządzenie wyłączone");
            return { isOn: false };
        });
    }

    async getStatus() {
        return this._withDevice(async () => {
            const isOn = await this.device.get({ dps: 1 });
            return { isOn };
        });
    }
}
