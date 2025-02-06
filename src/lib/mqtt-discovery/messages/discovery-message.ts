import type { DiscoveryMessagePayload } from "./discovery-message-payload";

/**
 * Grobe Struktur einer Discovery message
 */
export interface DiscoveryMessage {
    /**
     * MQTT Discovery Topic, z.B. "homeassistant/sensor/my_device_config/config"
     */
    topic: string; // MQTT Discovery Topic, z.B. "homeassistant/sensor/my_device_config/config"
    /**
     * JSON-Payload, die die Konfiguration enthält
     */
    payload: DiscoveryMessagePayload; // JSON-Payload, die die Konfiguration enthält
}
