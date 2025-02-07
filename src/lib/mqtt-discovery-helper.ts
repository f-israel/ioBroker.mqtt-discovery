import type { DiscoveryMessage, DiscoveryMessagePayload } from "./discovery-message";

export type HomeassistantComponent = "sensor" | "switch" | "binary_sensor" | "select";
/**
 * Ermittelt anhand des ioBroker-States die passende Home Assistant Komponente.
 * Dabei wird insbesondere der Typ (state.common.type) und optional die Rolle (state.common.role)
 * berücksichtigt:
 * - Boolean: Wird als "switch" genutzt, sofern die Rolle nicht explizit etwas sensorartiges (z.B. "binary_sensor") nahelegt.
 * - Number / String: Standardmäßig als "sensor".
 *
 * @param state Der ioBroker-State, dessen common-Informationen zur Klassifikation herangezogen werden.
 * @returns Den HA-Komponenten-Typ als string (z.B. "sensor", "switch" oder "binary_sensor")
 */
export function mapStateToHAComponent(state: ioBroker.Object): HomeassistantComponent {
    const type = state.common?.type;
    const role = (state.common?.role || "").toLowerCase();
    if (type === "boolean") {
        // Wenn in der Rolle beispielsweise "sensor" enthalten ist, könnte man auch
        // einen "binary_sensor" verwenden – hier als Beispiel:
        if (role.includes("sensor")) {
            return "binary_sensor";
        }
        // Standard: Bei Boolean als Schalter
        return "switch";
    } else if (type === "number" || type === "string") {
        if (state.common?.states) {
            return "select";
        }
        return "sensor";
    }
    // Fallback: sensor
    return "sensor";
}

/**
 * Generiert aus einer ioBroker State-ID und dem zugehörigen State-Objekt eine Discovery-Nachricht,
 * die für Home Assistant per MQTT Discovery genutzt werden kann.
 *
 * Wichtige Punkte:
 * - Das Discovery-Topic wird gemäß dem HA-Schema aufgebaut:
 *   "homeassistant/<haComponent>/<objectId>/config"
 * - Die objectId wird aus der State-ID generiert (Punkte werden z.B. durch Unterstriche ersetzt).
 * - Der Basis-MQTT-Topic (z.B. "iobroker/<stateId mit Slashes>") wird zur Definition der state_topic
 *   und ggf. command_topic genutzt.
 * - Je nach HA-Komponente (z.B. switch, sensor, binary_sensor) werden unterschiedliche Felder im Payload gesetzt.
 *
 * @param stateId Die ioBroker State-ID (z.B. "mqtt-discovery.0.my_device")
 * @param state Das zugehörige State-Objekt, das auch Informationen wie den Typ und die Rolle enthält.
 * @param adapter
 * @returns Ein Objekt mit dem Discovery-Topic und dem Payload, der per MQTT versendet werden kann.
 */
export function generateDiscoveryMessage(
    stateId: string,
    state: ioBroker.Object,
    adapter: ioBroker.Adapter,
): {
    message: DiscoveryMessage;
    haComponent: HomeassistantComponent;
} {
    // Ermitteln des HA-Komponenten-Typs anhand des State-Typs und ggf. der Rolle.
    const haComponent = mapStateToHAComponent(state);

    // Generiere eine eindeutige Object-ID, indem wir Punkte durch Unterstriche ersetzen.
    // Optional könntest du hier auch noch den Adapter-Namen entfernen, wenn du das möchtest.
    const objectId = stateId.replace(/\./g, "_");

    // Das Discovery-Topic gemäß HA-Schema:
    // Beispiel: "homeassistant/switch/mqtt-discovery_0_my_device/config"
    let discoveryTopicConfig = adapter.config.discoveryTopic;
    if (discoveryTopicConfig && !discoveryTopicConfig.endsWith("/")) {
        discoveryTopicConfig = `${discoveryTopicConfig}/`;
    }
    const discoveryTopic = `${discoveryTopicConfig}${haComponent}/${objectId}/config`;

    // Erzeuge den Basis-MQTT-Topic, in dem die State-Informationen abgelegt werden:
    // Hierbei werden Punkte in der State-ID durch Slashes ersetzt.
    // Beispiel: "iobroker/mqtt-discovery/0/my_device"
    let stateTopicConfig = adapter.config.stateTopic;
    if (stateTopicConfig && !stateTopicConfig.endsWith("/")) {
        stateTopicConfig = `${stateTopicConfig}/`;
    }
    const baseTopic = `${stateTopicConfig}${stateId.replace(/\./g, "/")}`;

    // Grundlegender Payload, der in jedem Fall gesetzt wird:
    let payload: DiscoveryMessagePayload = {
        name: objectId,
        state_topic: `${baseTopic}`,
        unique_id: `mqtt_discovery_${objectId}`,
    };

    // Abhängig von der HA-Komponente fügen wir weitere Felder hinzu:
    if (haComponent === "switch") {
        // Für Schalter: Definiere zusätzlich den command_topic und die Payloads für ON/OFF.
        payload = {
            ...payload,
            command_topic: `${baseTopic}`,
            payload_on: "true",
            payload_off: "false",
            state_on: "true",
            state_off: "false",
            qos: 0,
            retain: false,
        };
    } else if (haComponent === "binary_sensor") {
        // Binary Sensoren sind in der Regel read-only.
        // Hier definieren wir aber dennoch, welche Payloads als ON/OFF gelten.
        // payload = {
        //     ...payload,
        //     payload_on: "true",
        //     payload_off: "false",
        // };
    } else if (haComponent === "sensor") {
        // Für Sensoren können weitere Felder wie die Einheit gesetzt werden,
        // sofern diese im State hinterlegt sind.
        if (state.common?.unit) {
            payload.unit_of_measurement = state.common.unit;
        }
        // Optional: Setze einen device_class, wenn die Rolle bestimmte Hinweise enthält.
        const roleLower = (state.common?.role || "").toLowerCase();
        if (roleLower.includes("temp")) {
            payload.device_class = "temperature";
        } else if (roleLower.includes("humidity")) {
            payload.device_class = "humidity";
        } else if (roleLower.includes("pressure")) {
            payload.device_class = "pressure";
        }
    } else if (haComponent === "select") {
        // Für Sensoren können weitere Felder wie die Einheit gesetzt werden,
        // sofern diese im State hinterlegt sind.
        payload = {
            ...payload,
            command_topic: `${baseTopic}`,
            options: Object.keys(state.common?.states),
        };
    }

    return {
        haComponent: haComponent,
        message: {
            topic: discoveryTopic,
            payload: payload,
        },
    };
}
