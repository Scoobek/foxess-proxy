/**
 * TuyAPI - komunikacja z urządzeniami Tuya
 * Persistent connection - połączenie utrzymywane, reconnect przy błędach
 */

import TuyAPI from "tuyapi";
import {
    TUYA_CONNECT_TIMEOUT_MS,
    TUYA_MAX_RETRIES,
    TUYA_OPERATION_TIMEOUT_MS,
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

    _forceDisconnect() {
        this.isConnected = false;
        this.connectionPromise = null;
        try {
            this.device.disconnect();
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
                return { success: true, ...result };
            } catch (err) {
                lastError = err;
                this.log.warn(
                    { error: err.message, attempt, maxRetries: TUYA_MAX_RETRIES },
                    "Błąd operacji - próba retry"
                );
                this._forceDisconnect();

                if (attempt < TUYA_MAX_RETRIES) {
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }
        }

        this.log.error({ error: lastError.message }, "Błąd operacji po wszystkich próbach");
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

    disconnect() {
        if (this.isConnected) {
            try {
                this.device.disconnect();
            } catch {
                // ignoruj
            }
        }
    }
}
