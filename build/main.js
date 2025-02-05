"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var mqtt = __toESM(require("mqtt"));
var import_mqtt_discovery_helper = require("./lib/mqtt-discovery-helper");
var import_state_finder = require("./lib/state-finder");
class MqttDiscovery extends utils.Adapter {
  // MQTT-Client speichern – initial null
  client = null;
  useMqttInstance = false;
  constructor(options = {}) {
    super({
      ...options,
      name: "mqtt-discovery"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Wird aufgerufen, wenn der Adapter bereit ist.
   */
  onReady() {
    if (this.config.mqttInstance && this.config.mqttInstance !== "") {
      this.log.info(`Verwende vorhandene MQTT-Instanz: ${this.config.mqttInstance}`);
      this.useMqttInstance = true;
      this.checkDiscoveryWrite();
    } else {
      const protocol = this.config.mqttProtocol || "mqtt";
      const host = this.config.mqttHost || "localhost";
      const port = this.config.mqttPort || 1883;
      const username = this.config.mqttUsername || "";
      const password = this.config.mqttPassword || "";
      const clientId = this.config.mqttClientId || "ioBroker-mqtt-discovery";
      const url = `${protocol}://${host}:${port}`;
      this.log.info(`Verbinde direkt zu MQTT-Broker unter ${url} als ${clientId}`);
      const options = { clientId };
      if (username)
        options.username = username;
      if (password)
        options.password = password;
      this.client = mqtt.connect(url, options);
      this.client.on("connect", () => {
        this.log.info("Direkte MQTT-Verbindung hergestellt.");
        this.publishDiscovery();
        this.checkDiscoveryWrite();
      });
      this.client.on("error", (err) => {
        this.log.error(`MQTT-Fehler: ${err.message}`);
      });
    }
  }
  /**
   * Führt einen kurzen Test-Publish aus, um zu prüfen, ob das Schreiben möglich ist.
   */
  checkDiscoveryWrite() {
    const testTopic = "ioBroker/mqtt-discovery/test";
    const testMessage = "Test";
    if (this.useMqttInstance && this.config.mqttInstance) {
      this.sendTo(
        this.config.mqttInstance,
        "publish",
        { topic: testTopic, message: testMessage, retain: false },
        (response) => {
          if (response && response.error) {
            this.log.error(`Test-Publish via MQTT-Instanz fehlgeschlagen: ${response.error}`);
          } else {
            this.log.info("Test-Publish via MQTT-Instanz erfolgreich.");
          }
        }
      );
    } else {
      if (this.client) {
        this.client.publish(testTopic, testMessage, { retain: false }, (err) => {
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
  async publishDiscovery() {
    if (!this.client) {
      this.log.error("MQTT-Client ist nicht initialisiert.");
      return;
    }
    const allStates = await (0, import_state_finder.findStatesMarkedWithEnum)(this, "homeassistant_enabled");
    if (allStates.length == 0) {
      this.log.warn("No object with enum.function.homeassistant_enabled found");
      return;
    }
    for (const stateId of allStates) {
      const state = await this.getForeignObjectAsync(stateId);
      if (!state)
        continue;
      const discovery = (0, import_mqtt_discovery_helper.generateDiscoveryMessage)(stateId, state);
      this.client.publish(discovery.topic, JSON.stringify(discovery.payload), { retain: true }, (err) => {
        if (err) {
          this.log.error(`Fehler beim Senden der Discovery-Nachricht: ${err.message}`);
        } else {
          this.log.info(`Discovery-Nachricht f\xFCr "${stateId}" gesendet.`);
        }
      });
    }
  }
  /**
   * Handler für iobroker-State-Änderungen.
   *
   * @param id - Die ID des geänderten States (z.B. "mqtt-discovery.0.my_device")
   * @param state - Der neue State oder null, falls der State gelöscht wurde.
   */
  onStateChange(id, state) {
    if (state) {
      this.log.debug(`State ${id} ge\xE4ndert: ${state.val}`);
      if (this.client) {
        const topic = `iobroker/${id.replace(/\./g, "/")}/state`;
        this.client.publish(topic, String(state.val), { retain: true }, (err) => {
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
  onUnload(callback) {
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
  module.exports = (options) => new MqttDiscovery(options);
} else {
  (() => new MqttDiscovery())();
}
//# sourceMappingURL=main.js.map
