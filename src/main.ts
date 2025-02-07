/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import { EXIT_CODES } from "@iobroker/adapter-core";
import * as mqtt from "mqtt";
import { findStatesMarkedWithEnum } from "./lib/state-finder";
import { generateDiscoveryMessage, type HomeassistantComponent } from "./lib/mqtt-discovery-helper";
import { clearInterval } from "node:timers";
// Load your modules here, e.g.:
// import * as fs from "fs";
class MqttDiscovery extends utils.Adapter {
    // MQTT-Client speichern – initial null
    private client: mqtt.MqttClient | null = null;
    private useMqttInstance: boolean = false;
    private isFirstTimeConnect: boolean = true;
    private rescanInterval: NodeJS.Timeout | null = null;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "mqtt-discovery",
        });
        // Registriere Event-Handler
        this.on("ready", this.onReady.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Wird aufgerufen, wenn der Adapter bereit ist.
     */
    private async onReady(): Promise<void> {
        this.log.info(`1722`);
        if (!this.config.mqttInstance && !this.config.mqttHost) {
            this.stop && void this.stop({ reason: "Not configured", exitCode: EXIT_CODES.INVALID_ADAPTER_CONFIG });
        }

        await this.extendObject("device_count", { type: "state", common: { write: false, type: "number", def: 0 } });
        await this.extendObject("sensor_count", { type: "state", common: { write: false, type: "number", def: 0 } });
        await this.extendObject("switch_count", { type: "state", common: { write: false, type: "number", def: 0 } });

        // Prüfe, ob eine bestehende MQTT-Instanz ausgewählt wurde
        if (this.config.mqttInstance && this.config.mqttInstance !== "") {
            this.log.info(`Verwende vorhandene MQTT-Instanz: ${this.config.mqttInstance}`);
            this.useMqttInstance = true;
            // Bei Verwendung einer Instanz erfolgt das Publish später über sendTo
            if (await this.checkDiscoveryWrite()) {
                this.log.debug("MQTT-Publish-Test erfolgreich");
                await this.publishDiscovery();

                await this.setStateChangedAsync("info.connection", true, true);
                if (this.config.stateRescanInterval && !this.rescanInterval) {
                    this.rescanInterval = setInterval(
                        this.publishDiscovery.bind(this),
                        this.config.stateRescanInterval * 1000,
                    );
                }
            } else {
                this.log.error("MQTT-Publish ist nicht erlaubt");
            }
        } else {
            // Direktverbindung: Erstelle den Verbindungs-URL aus Protokoll, Host und Port
            const protocol: string = this.config.mqttProtocol || "mqtt";
            const host: string = this.config.mqttHost || "localhost";
            const port: number = this.config.mqttPort || 1883;
            const username: string = this.config.mqttUsername || "";
            const password: string = this.config.mqttPassword || "";
            const clientId: string = this.config.mqttClientId || "ioBroker-mqtt-discovery";
            const url = `${protocol}://${host}:${port}`;

            this.log.info(`Verbinde direkt zu MQTT-Broker unter ${url} als ${clientId}`);
            const options: mqtt.IClientOptions = { clientId };
            if (username) {
                options.username = username;
            }
            if (password) {
                options.password = password;
            }

            this.client = mqtt.connect(url, options);
            this.client.on("connect", async () => {
                this.isFirstTimeConnect = false;
                this.log.info("Direkte MQTT-Verbindung hergestellt.");
                if (await this.checkDiscoveryWrite()) {
                    this.log.debug("MQTT-Publish-Test erfolgreich");
                    await this.publishDiscovery();
                    await this.setStateChangedAsync("info.connection", true, true);
                    if (this.config.stateRescanInterval && !this.rescanInterval) {
                        this.rescanInterval = setInterval(
                            this.publishDiscovery.bind(this),
                            this.config.stateRescanInterval * 1000,
                        );
                    }
                } else {
                    this.log.error("MQTT-Publish ist nicht erlaubt");
                    this.client!.end();
                }
            });
            this.client.on("error", async (err: Error) => {
                if (err instanceof AggregateError && err.errors) {
                    err.errors.forEach((error, errIdx) => {
                        this.log.error(`MQTT-Fehler #${errIdx + 1}: ${error}`);
                    });
                } else {
                    this.log.error(`MQTT-Fehler: ${err.message}`);
                }
                if (this.isFirstTimeConnect) {
                    this.stop &&
                        (await this.stop({
                            reason: "MQTT connection seems invalid",
                            exitCode: EXIT_CODES.INVALID_ADAPTER_CONFIG,
                        }));
                }
            });

            // Hier könntest du auch weitere Event-Handler hinzufügen (z.B. für "message")
        }
    }

    private async incrementComponentCounterState(comp: HomeassistantComponent): Promise<void> {
        let compStateId: string;
        switch (comp) {
            case "sensor":
                compStateId = "sensor";
                break;
            case "switch":
                compStateId = "switch";
                break;
            case "binary_sensor":
                compStateId = "sensor";
                break;
            default:
                return;
        }
        compStateId = `${compStateId}_count`;
        const cnt = ((await this.getStateAsync(compStateId))?.val as number) ?? 0;
        await this.setStateChangedAsync(compStateId, cnt + 1, true);
    }

    private async mqttPublish(
        topic: string,
        payload: string | Buffer,
        opts?: mqtt.IClientPublishOptions,
    ): Promise<boolean> {
        opts = { retain: false, ...opts };
        return await new Promise(resolve => {
            if (this.useMqttInstance && this.config.mqttInstance) {
                this.sendTo(
                    this.config.mqttInstance,
                    "sendMessage2Client",
                    { topic: topic, message: payload, ...opts },
                    (response: any) => {
                        if (response && response.error) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    },
                );
            } else if (this.client) {
                this.client.publish(topic, payload, opts, (err?: Error) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } else {
                this.log.error("Keine MQTT-Verbindung verfügbar.");
                resolve(false);
            }
        });
    }

    /**
     * Führt einen kurzen Test-Publish aus, um zu prüfen, ob das Schreiben möglich ist.
     */

    private async checkDiscoveryWrite(): Promise<boolean> {
        const testTopic = "mqtt-discovery/write-test";
        const testMessage = "true";

        return await this.mqttPublish(testTopic, testMessage, { retain: false });
    }

    /**
     * Veröffentlicht eine MQTT Discovery Nachricht für ein Beispielgerät (Switch).
     */
    private async publishDiscovery(): Promise<void> {
        await this.setState("device_count", 0, true);
        await this.setState("sensor_count", 0, true);
        await this.setState("switch_count", 0, true);

        const allStates = await findStatesMarkedWithEnum(this, "homeassistant_enabled");
        if (allStates.length == 0) {
            this.log.warn("No object with enum.function.homeassistant_enabled found");
            return;
        }
        await this.setState("device_count", allStates.length, true);
        for (const stateId of allStates) {
            const state = await this.getForeignObjectAsync(stateId);
            if (!state) {
                continue;
            }
            const { haComponent, message: discovery } = generateDiscoveryMessage(stateId, state, this);
            const success = await this.mqttPublish(discovery.topic, JSON.stringify(discovery.payload), {
                retain: true,
            });
            if (!success) {
                this.log.error(`Fehler beim Senden der Discovery-Nachricht`);
            } else {
                this.log.debug(`Discovery-Nachricht für "${stateId}" als "${discovery.topic}" gesendet.`);
                await this.incrementComponentCounterState(haComponent);
            }
        }
    }

    /**
     * Wird beim Herunterfahren des Adapters aufgerufen.
     *
     * @param callback - Callback, das signalisiert, dass der Adapter sauber heruntergefahren wurde.
     */
    private async onUnload(callback: () => void): Promise<void> {
        try {
            if (this.rescanInterval) {
                clearInterval(this.rescanInterval);
            }
            if (this.client) {
                this.client.end();
            }

            await this.setState("info.connection", false, true);

            callback();
        } catch {
            callback();
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new MqttDiscovery(options);
} else {
    // otherwise start the instance directly
    (() => new MqttDiscovery())();
}
