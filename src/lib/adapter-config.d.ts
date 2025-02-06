// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            stateRescanInterval: number;
            mqttHost: string;
            mqttPort: number;
            mqttUsername: string;
            mqttPassword: string;

            mqttProtocol: string;
            mqttClientId: string;
            mqttInstance: string;

            discoveryTopic: string;
            stateTopic: string;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
