/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import * as mqtt from "mqtt";
import { generateDiscoveryMessage } from "./lib/mqtt-discovery-helper";
import { findStatesMarkedWithEnum } from "./lib/state-finder";

// Load your modules here, e.g.:
// import * as fs from "fs";
class MqttDiscovery extends utils.Adapter {
    // MQTT-Client speichern – initial null
    private client: mqtt.MqttClient | null = null;
    private useMqttInstance: boolean = false;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "mqtt-discovery",
        });
        // Registriere Event-Handler
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Wird aufgerufen, wenn der Adapter bereit ist.
     */
    private onReady(): void {
        // Prüfe, ob eine bestehende MQTT-Instanz ausgewählt wurde
        if (this.config.mqttInstance && this.config.mqttInstance !== "") {
            this.log.info(`Verwende vorhandene MQTT-Instanz: ${this.config.mqttInstance}`);
            this.useMqttInstance = true;
            // Bei Verwendung einer Instanz erfolgt das Publish später über sendTo
            this.checkDiscoveryWrite();
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
            if (username) options.username = username;
            if (password) options.password = password;

            this.client = mqtt.connect(url, options);
            this.client.on("connect", () => {
                this.log.info("Direkte MQTT-Verbindung hergestellt.");
                this.publishDiscovery();
                this.checkDiscoveryWrite();
            });
            this.client.on("error", (err: Error) => {
                this.log.error(`MQTT-Fehler: ${err.message}`);
            });
            // Hier könntest du auch weitere Event-Handler hinzufügen (z. B. für "message")
        }
    }

    /**
     * Führt einen kurzen Test-Publish aus, um zu prüfen, ob das Schreiben möglich ist.
     */
    private checkDiscoveryWrite(): void {
        const testTopic = "ioBroker/mqtt-discovery/test";
        const testMessage = "Test";
        if (this.useMqttInstance && this.config.mqttInstance) {
            this.sendTo(
                this.config.mqttInstance,
                "publish",
                { topic: testTopic, message: testMessage, retain: false },
                (response: any) => {
                    if (response && response.error) {
                        this.log.error(`Test-Publish via MQTT-Instanz fehlgeschlagen: ${response.error}`);
                    } else {
                        this.log.info("Test-Publish via MQTT-Instanz erfolgreich.");
                    }
                },
            );
        } else {
            if (this.client) {
                this.client.publish(testTopic, testMessage, { retain: false }, (err?: Error) => {
                    if (err) {
                        this.log.error(`Test-Publish fehlgeschlagen: ${err.message}`);
                    } else {
                        this.log.info("Test-Publish direkt erfolgreich.");
                    }
                });
            }
        }
    }

    /**
     * Veröffentlicht eine MQTT Discovery Nachricht für ein Beispielgerät (Switch).
     */
    private async publishDiscovery(): Promise<void> {
        if (!this.client) {
            this.log.error("MQTT-Client ist nicht initialisiert.");
            return;
        }

        const allStates = await findStatesMarkedWithEnum(this, "homeassistant_enabled");
        if (allStates.length == 0) {
            this.log.warn("No object with enum.function.homeassistant_enabled found");
            return;
        }

        for (const stateId of allStates) {
            const state = await this.getForeignObjectAsync(stateId);
            if (!state) continue;
            const discovery = generateDiscoveryMessage(stateId, state);
            this.client.publish(discovery.topic, JSON.stringify(discovery.payload), { retain: true }, (err?: Error) => {
                if (err) {
                    this.log.error(`Fehler beim Senden der Discovery-Nachricht: ${err.message}`);
                } else {
                    this.log.info(`Discovery-Nachricht für "${stateId}" gesendet.`);
                }
            });
        }

        //
        // const discoveryTopic = 'homeassistant/switch/my_device/config';
        // const payload = {
        //     name: 'My Device',
        //     command_topic: 'iobroker/my_device/set', // Topic, an das HA Befehle sendet
        //     state_topic: 'iobroker/my_device/state', // Topic, von dem HA den Status liest
        //     unique_id: 'mqtt_discovery_my_device',
        //     payload_on: 'ON',
        //     payload_off: 'OFF',
        // };
        //
        // // Publiziere die Discovery-Nachricht (retain: true sorgt dafür, dass HA die Nachricht auch nach einem Neustart erhält)
        // this.client.publish(discoveryTopic, JSON.stringify(payload), { retain: true }, (err?: Error) => {
        //     if (err) {
        //         this.log.error(`Fehler beim Senden der Discovery-Nachricht: ${err.message}`);
        //     } else {
        //         this.log.info('Discovery-Nachricht für "My Device" gesendet.');
        //     }
        // });
    }

    /**
     * Handler für iobroker-State-Änderungen.
     *
     * @param id - Die ID des geänderten States (z.B. "mqtt-discovery.0.my_device")
     * @param state - Der neue State oder null, falls der State gelöscht wurde.
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            this.log.debug(`State ${id} geändert: ${state.val}`);
            if (this.client) {
                // Beispielhaft: Konvertiere die State-ID in ein MQTT-Topic
                // Ersetzt Punkte durch Slashes: "mqtt-discovery.0.my_device" -> "iobroker/mqtt-discovery/0/my_device/state"
                const topic = `iobroker/${id.replace(/\./g, "/")}/state`;
                this.client.publish(topic, String(state.val), { retain: true }, (err?: Error) => {
                    if (err) {
                        this.log.error(`Fehler beim Senden des State ${id} an MQTT: ${err.message}`);
                    } else {
                        this.log.debug(`State ${id} erfolgreich an MQTT-Topic ${topic} gesendet.`);
                    }
                });
            }
        }
    }

    /**
     * Wird beim Herunterfahren des Adapters aufgerufen.
     *
     * @param callback - Callback, das signalisiert, dass der Adapter sauber heruntergefahren wurde.
     */
    private onUnload(callback: () => void): void {
        try {
            if (this.client) {
                this.client.end();
            }
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
