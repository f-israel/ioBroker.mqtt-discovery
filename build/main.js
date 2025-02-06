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
var import_adapter_core = require("@iobroker/adapter-core");
var mqtt = __toESM(require("mqtt"));
var import_state_finder = require("./lib/state-finder");
var import_mqtt_discovery_helper = require("./lib/mqtt-discovery-helper");
var import_node_timers = require("node:timers");
class MqttDiscovery extends utils.Adapter {
  // MQTT-Client speichern – initial null
  client = null;
  useMqttInstance = false;
  isFirstTimeConnect = true;
  rescanInterval = null;
  constructor(options = {}) {
    super({
      ...options,
      name: "mqtt-discovery"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Wird aufgerufen, wenn der Adapter bereit ist.
   */
  async onReady() {
    if (!this.config.mqttInstance && !this.config.mqttHost) {
      this.stop && void this.stop({ reason: "Not configured", exitCode: import_adapter_core.EXIT_CODES.INVALID_ADAPTER_CONFIG });
    }
    await this.extendObject("device_count", { type: "state", common: { write: false, type: "number", def: 0 } });
    await this.extendObject("sensor_count", { type: "state", common: { write: false, type: "number", def: 0 } });
    await this.extendObject("switch_count", { type: "state", common: { write: false, type: "number", def: 0 } });
    if (this.config.mqttInstance && this.config.mqttInstance !== "") {
      this.log.info(`Verwende vorhandene MQTT-Instanz: ${this.config.mqttInstance}`);
      this.useMqttInstance = true;
      if (await this.checkDiscoveryWrite()) {
        this.log.debug("MQTT-Publish-Test erfolgreich");
        await this.publishDiscovery();
        await this.setStateChangedAsync("info.connection", true, true);
        if (this.config.stateRescanInterval && !this.rescanInterval) {
          this.rescanInterval = setInterval(
            this.publishDiscovery.bind(this),
            this.config.stateRescanInterval * 1e3
          );
        }
      } else {
        this.log.error("MQTT-Publish ist nicht erlaubt");
      }
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
              this.config.stateRescanInterval * 1e3
            );
          }
        } else {
          this.log.error("MQTT-Publish ist nicht erlaubt");
          this.client.end();
        }
      });
      this.client.on("error", async (err) => {
        if (err instanceof AggregateError && err.errors) {
          err.errors.forEach((error, errIdx) => {
            this.log.error(`MQTT-Fehler #${errIdx + 1}: ${error}`);
          });
        } else {
          this.log.error(`MQTT-Fehler: ${err.message}`);
        }
        if (this.isFirstTimeConnect) {
          this.stop && await this.stop({
            reason: "MQTT connection seems invalid",
            exitCode: import_adapter_core.EXIT_CODES.INVALID_ADAPTER_CONFIG
          });
        }
      });
    }
  }
  async incrementComponentCounterState(comp) {
    var _a, _b;
    let compStateId;
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
    const cnt = (_b = (_a = await this.getStateAsync(compStateId)) == null ? void 0 : _a.val) != null ? _b : 0;
    await this.setStateChangedAsync(compStateId, cnt + 1, true);
  }
  async mqttPublish(topic, payload, opts) {
    opts = { retain: false, ...opts };
    return await new Promise((resolve) => {
      if (this.useMqttInstance && this.config.mqttInstance) {
        this.sendTo(
          this.config.mqttInstance,
          "sendMessage2Client",
          { topic, message: payload, ...opts },
          (response) => {
            if (response && response.error) {
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      } else if (this.client) {
        this.client.publish(topic, payload, opts, (err) => {
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } else {
        this.log.error("Keine MQTT-Verbindung verf\xFCgbar.");
        resolve(false);
      }
    });
  }
  /**
   * Führt einen kurzen Test-Publish aus, um zu prüfen, ob das Schreiben möglich ist.
   */
  async checkDiscoveryWrite() {
    const testTopic = "mqtt-discovery/write-test";
    const testMessage = "true";
    return await this.mqttPublish(testTopic, testMessage, { retain: false });
  }
  /**
   * Veröffentlicht eine MQTT Discovery Nachricht für ein Beispielgerät (Switch).
   */
  async publishDiscovery() {
    await this.setState("device_count", 0, true);
    await this.setState("sensor_count", 0, true);
    await this.setState("switch_count", 0, true);
    const allStates = await (0, import_state_finder.findStatesMarkedWithEnum)(this, "homeassistant_enabled");
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
      const { haComponent, message: discovery } = (0, import_mqtt_discovery_helper.generateDiscoveryMessage)(stateId, state, this);
      const success = await this.mqttPublish(discovery.topic, JSON.stringify(discovery.payload), {
        retain: true
      });
      if (!success) {
        this.log.error(`Fehler beim Senden der Discovery-Nachricht`);
      } else {
        this.log.debug(`Discovery-Nachricht f\xFCr "${stateId}" als "${discovery.topic}" gesendet.`);
        await this.incrementComponentCounterState(haComponent);
      }
    }
  }
  /**
   * Wird beim Herunterfahren des Adapters aufgerufen.
   *
   * @param callback - Callback, das signalisiert, dass der Adapter sauber heruntergefahren wurde.
   */
  async onUnload(callback) {
    try {
      if (this.rescanInterval) {
        (0, import_node_timers.clearInterval)(this.rescanInterval);
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
  module.exports = (options) => new MqttDiscovery(options);
} else {
  (() => new MqttDiscovery())();
}
//# sourceMappingURL=main.js.map
