import GreeClient from "gree-hvac-client";
import {
    GREE_CONNECT_TIMEOUT_MS,
    GREE_CONNECT_WAIT_MS,
    GREE_NO_RESPONSE_THRESHOLD,
    GREE_POLLING_INTERVAL_MS,
    GREE_POLLING_TIMEOUT_MS,
} from "../../config/index.js";
import { createLogger } from "../../shared/logger.js";

const { Client, PROPERTY, VALUE } = GreeClient;

export class GreeDevice {
    constructor({ id, name, ip }) {
        this.id = id;
        this.name = name;
        this.ip = ip;
        this.log = createLogger(`ac:${name}`);
        this._state = {};
        this._reachable = false;
        this._noResponseCount = 0;
        this._client = null;
    }

    connect(onStateUpdate) {
        return new Promise((resolve) => {
            let resolved = false;
            const done = () => { if (!resolved) { resolved = true; resolve(); } };

            this._client = new Client({
                host: this.ip,
                connectTimeout: GREE_CONNECT_TIMEOUT_MS,
                pollingTimeout: GREE_POLLING_TIMEOUT_MS,
                pollingInterval: GREE_POLLING_INTERVAL_MS,
            });

            setTimeout(done, GREE_CONNECT_WAIT_MS);

            this._client.on("connect", () => {
                this._reachable = true;
                this.log.info("Połączono z AC");
                done();
            });

            this._client.on("update", (_, allProps) => {
                this._noResponseCount = 0;
                this._reachable = true;
                this._state = {
                    isOn: allProps[PROPERTY.power] === VALUE.power.on,
                    currentTemperature: allProps[PROPERTY.currentTemperature],
                    mode: allProps[PROPERTY.mode],
                    setTemperature: allProps[PROPERTY.temperature],
                };
                onStateUpdate(this.getState());
            });

            this._client.on("no_response", () => {
                this._noResponseCount++;
                if (this._noResponseCount >= GREE_NO_RESPONSE_THRESHOLD) {
                    this._reachable = false;
                    this.log.warn(
                        { count: this._noResponseCount },
                        "Brak odpowiedzi od AC - urządzenie nieosiągalne"
                    );
                    onStateUpdate(this.getState());
                } else {
                    this.log.debug(
                        { count: this._noResponseCount, threshold: GREE_NO_RESPONSE_THRESHOLD },
                        "Brak odpowiedzi od AC"
                    );
                }
            });

            this._client.on("error", (err) => {
                if (err.constructor.name === "ClientConnectTimeoutError") {
                    this.log.warn("Timeout połączenia AC - ponawiam");
                } else {
                    this.log.error({ err: err.message, origin: err.origin?.message }, "Błąd klienta AC");
                }
            });
        });
    }

    turnOn() {
        this._client.setProperty(PROPERTY.power, VALUE.power.on);
        this.log.info("Włączanie AC");
    }

    turnOff() {
        this._client.setProperty(PROPERTY.power, VALUE.power.off);
        this.log.info("Wyłączanie AC");
    }

    getState() {
        return {
            id: this.id,
            name: this.name,
            reachable: this._reachable,
            ...this._state,
        };
    }
}
