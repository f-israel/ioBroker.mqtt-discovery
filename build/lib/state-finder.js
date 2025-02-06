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
var state_finder_exports = {};
__export(state_finder_exports, {
  findStatesMarkedWithEnum: () => findStatesMarkedWithEnum
});
module.exports = __toCommonJS(state_finder_exports);
async function findStatesMarkedWithEnum(adapter, enumId) {
  var _a;
  const resolveToStateIds = async (adapter2, objId) => {
    const obj = await adapter2.getForeignObjectAsync(objId);
    if (!obj) {
      return [];
    }
    switch (obj.type) {
      case "state":
        return [obj._id];
      case "channel":
      case "device":
      case "folder":
      case "meta":
      case "adapter":
      case "instance":
      case "group":
        break;
      case "enum":
      case "host":
      case "user":
      case "script":
      case "chart":
      case "schedule":
      case "config":
      case "design":
        adapter2.log.warn(`Found object of type '${obj.type}' which is not supported`);
        return [];
    }
    adapter2.log.debug(`Found object '${obj._id}' of type '${obj.type}' - searching for members`);
    const distinctList = [];
    for (const stateId in await adapter2.getForeignStatesAsync(`${obj._id}.*`)) {
      if (!distinctList.includes(stateId)) {
        distinctList.push(stateId);
      }
    }
    return distinctList;
  };
  const enumObj = await adapter.getForeignObjectAsync(`enum.functions.${enumId}`);
  let stateIds = [];
  for (const member of (_a = enumObj == null ? void 0 : enumObj.common.members) != null ? _a : []) {
    stateIds = [...stateIds, ...await resolveToStateIds(adapter, member)];
  }
  return stateIds;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findStatesMarkedWithEnum
});
//# sourceMappingURL=state-finder.js.map
