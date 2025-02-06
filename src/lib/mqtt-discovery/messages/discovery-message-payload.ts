/**
 * @see https://www.home-assistant.io/integrations/mqtt/#discovery-payload
 */

/**
 * Informationen zum Gerät, das die MQTT-Nachricht sendet.
 */
export interface DeviceInfo {
    /** Eindeutige Identifikatoren für das Gerät */
    identifiers: string[];
    /** Name des Geräts */
    name: string;
    /** Hersteller des Geräts */
    manufacturer?: string;
    /** Modellbezeichnung des Geräts */
    model?: string;
    /** Softwareversion des Geräts */
    sw_version?: string;
    /** Referenz auf ein übergeordnetes Gerät */
    via_device?: string;
    /** URL zur Gerätekonfiguration */
    configuration_url?: string;
}

/**
 * Verfügbarkeitsinformationen für das Gerät.
 */
export interface Availability {
    /** MQTT-Topic für den Verfügbarkeitsstatus */
    topic: string;
    /** Payload für "verfügbar" */
    payload_available?: string;
    /** Payload für "nicht verfügbar" */
    payload_not_available?: string;
    /** Template zur Verarbeitung der Verfügbarkeitswerte */
    value_template?: string;
}

/**
 * Basis-Interface für alle MQTT Discovery-Payloads.
 */
export interface DiscoveryMessageBase {
    /** Name der Entität */
    name: string;
    /** Eindeutige ID der Entität */
    unique_id: string;
    /** Geräteinformationen */
    device?: DeviceInfo;
    /** Verfügbarkeitsinformationen */
    availability?: Availability[];
    /** Modus zur Bestimmung der Verfügbarkeit */
    availability_mode?: "all" | "any" | "latest";
    /** Quality of Service-Level für MQTT-Nachrichten */
    qos?: number;
    /** Gibt an, ob Nachrichten beibehalten werden */
    retain?: boolean;
    /** Standardmäßig aktivierte Entität */
    enabled_by_default?: boolean;
    /** Objekt-ID für die Entität */
    object_id?: string;
    /** Icon für die Anzeige in Home Assistant */
    icon?: string;
}

/**
 * @see https://www.home-assistant.io/integrations/sensor.mqtt/#device
 * MQTT Discovery-Payload für Sensoren.
 */
export interface DiscoveryMessageSensor extends DiscoveryMessageBase {
    /** MQTT-Topic für den Status des Sensors */
    state_topic: string;
    /** Gerätekategorie (z. B. temperature, humidity) */
    device_class?: string;
    /** Einheit der Messwerte (z. B. °C, %, V) */
    unit_of_measurement?: string;
    /** Topic für zusätzliche JSON-Attribute */
    json_attributes_topic?: string;
    /** Anzahl der Nachkommastellen für die Genauigkeit */
    accuracy_decimals?: number;
    /** Template zur Verarbeitung von Werten */
    value_template?: string;
    /** Klassifizierung des Statuswerts */
    state_class?: "measurement" | "total" | "total_increasing";
    /** Topic für den letzten Reset */
    last_reset_topic?: string;
    /** Template zur Verarbeitung des letzten Resets */
    last_reset_value_template?: string;
}

/**
 * @see https://www.home-assistant.io/integrations/switch.mqtt/#device
 * MQTT Discovery-Payload für Schalter.
 */
export interface DiscoveryMessageSwitch extends DiscoveryMessageBase {
    /** MQTT-Topic für Befehle zum Schalten */
    command_topic: string;
    /** MQTT-Topic für den aktuellen Status */
    state_topic?: string;
    /** Payload für den EIN-Status */
    payload_on?: string;
    /** Payload für den AUS-Status */
    payload_off?: string;
    /** Optimistischer Modus ohne Status-Feedback */
    optimistic?: boolean;
    /** Template zur Verarbeitung des Statuswerts */
    value_template?: string;
    /** Wert, der den Status "EIN" darstellt */
    state_on?: string;
    /** Wert, der den Status "AUS" darstellt */
    state_off?: string;
    /** Topic für zusätzliche JSON-Attribute */
    json_attributes_topic?: string;
}

/**
 * @see https://www.home-assistant.io/integrations/mqtt/#discovery-payload
 * Union-Typ für alle unterstützten MQTT Discovery-Payloads.
 */
export type DiscoveryMessagePayload = DiscoveryMessageSensor | DiscoveryMessageSwitch;
