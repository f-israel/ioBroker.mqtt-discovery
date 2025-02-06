"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var mqtt_discovery_helper_exports = {};
__export(mqtt_discovery_helper_exports, {
  generateDiscoveryMessage: () => generateDiscoveryMessage,
  mapStateToHAComponent: () => mapStateToHAComponent
});
module.exports = __toCommonJS(mqtt_discovery_helper_exports);
function mapStateToHAComponent(state) {
  var _a, _b;
  const type = (_a = state.common) == null ? void 0 : _a.type;
  const role = (((_b = state.common) == null ? void 0 : _b.role) || "").toLowerCase();
  if (type === "boolean") {
    if (role.includes("sensor")) {
      return "binary_sensor";
    }
    return "switch";
  } else if (type === "number" || type === "string") {
    return "sensor";
  }
  return "sensor";
}
function generateDiscoveryMessage(stateId, state, adapter) {
  var _a, _b;
  const haComponent = mapStateToHAComponent(state);
  const objectId = stateId.replace(/\./g, "_");
  let discoveryTopicConfig = adapter.config.discoveryTopic;
  if (discoveryTopicConfig && !discoveryTopicConfig.endsWith("/")) {
    discoveryTopicConfig = `${discoveryTopicConfig}/`;
  }
  const discoveryTopic = `${discoveryTopicConfig}${haComponent}/${objectId}/config`;
  let stateTopicConfig = adapter.config.stateTopic;
  if (stateTopicConfig && !stateTopicConfig.endsWith("/")) {
    stateTopicConfig = `${stateTopicConfig}/`;
  }
  const baseTopic = `${stateTopicConfig}${stateId.replace(/\./g, "/")}`;
  let payload = {
    name: objectId,
    state_topic: `${baseTopic}`,
    unique_id: `mqtt_discovery_${objectId}`
  };
  if (haComponent === "switch") {
    payload = {
      ...payload,
      command_topic: `${baseTopic}`,
      payload_on: "ON",
      payload_off: "OFF"
    };
  } else if (haComponent === "binary_sensor") {
    payload = {
      ...payload,
      payload_on: "ON",
      payload_off: "OFF"
    };
  } else if (haComponent === "sensor") {
    if ((_a = state.common) == null ? void 0 : _a.unit) {
      payload.unit_of_measurement = state.common.unit;
    }
    const roleLower = (((_b = state.common) == null ? void 0 : _b.role) || "").toLowerCase();
    if (roleLower.includes("temp")) {
      payload.device_class = "temperature";
    } else if (roleLower.includes("humidity")) {
      payload.device_class = "humidity";
    } else if (roleLower.includes("pressure")) {
      payload.device_class = "pressure";
    }
  }
  return {
    haComponent,
    message: {
      topic: discoveryTopic,
      payload
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateDiscoveryMessage,
  mapStateToHAComponent
});
//# sourceMappingURL=mqtt-discovery-helper.js.map
