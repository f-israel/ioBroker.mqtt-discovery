![Logo](admin/mqtt-discovery.png)

# ioBroker.mqtt-discovery

[![NPM version](https://img.shields.io/npm/v/iobroker.mqtt-discovery.svg)](https://www.npmjs.com/package/iobroker.mqtt-discovery)
[![Downloads](https://img.shields.io/npm/dm/iobroker.mqtt-discovery.svg)](https://www.npmjs.com/package/iobroker.mqtt-discovery)
![Number of Installations](https://iobroker.live/badges/mqtt-discovery-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/mqtt-discovery-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.mqtt-discovery.png?downloads=true)](https://nodei.co/npm/iobroker.mqtt-discovery/)

**Tests:** ![Test and Release](https://github.com/f-israel/ioBroker.mqtt-discovery/workflows/Test%20and%20Release/badge.svg)

## mqtt-discovery adapter for ioBroker

Adapter, der MQTT Discovery Nachrichten für Home Assistant generiert

> [!WARNING]
> This is my very first ioBroker adapter!  
> This project is in active development—imagine a mad scientist’s lab where experiments are a daily routine. Expect quirky behavior, unexpected bugs, and plenty of caffeine-fueled code as I learn the ropes. Every bug report and suggestion earns a virtual high-five!
> Happy hacking and enjoy the chaos!

## Install
### Connectivity
It is not recommended to use an existing MQTT instance.
The adapter creates an additional state for each state, which holds the discovery configuration.
Instead, a separate MQTT instance should be created with the following settings.
Of course, the basic settings (IP address, port, authentication) can be adjusted and just need to match this adapters' configuration.
Most important settings are marked.

![Connection settings](doc/Page1_Connection.png)
![Server settings](doc/Page2_Server_Settings.png)
![MQTT settings](doc/Page3_MQTT_Settings.png)

Alternatively, any other MQTT broker should also be usable, such as the Home Assistant add-on (unconfirmed!).

### Usage
To enable Home Assistant Discovery, follow these steps:

1. **Create a Function in ioBroker:**
    - A function named `homeassistant_enabled` must be created in ioBroker (**IOB Admin → Enums → Functions**).

2. **Assign Devices to the Function:**
    - Any object that should be discovered by Home Assistant must be assigned to this function.
    - If an object is a container (e.g., **channel, meta, folder, group**), the adapter will scan recursively.

3. **Trigger Discovery Update:**
    - The adapter detects new objects when either:
        - The **State Rescan Interval** is reached, or
        - The adapter is restarted.

4. **(Only when using the ioBroker MQTT Broker) Clean up:**
    - Delete all unused discovery config holder states (**Objects → mqtt.0/{discovery topic}**) that are no longer needed.
    - Alternatively, delete all discovery config states before restarting the adapter.

## Changelog
### 0.1.2 (2025-02-07)
- (FI) fixed typo in GitHub links

### 0.1.1 (2025-02-07)
- (FI) fixing switch types (ON/OFF -> true/false)
- (FI) optimized some MQTT settings for better compatibility

### 0.1.0 (2025-02-06)
- (FI) just version bumping

### 0.0.3 (2025-02-06)
- (FI) first version with values in HA
- (FI) added simple documentation

### 0.0.3-alpha.3 (2025-02-06)
- (FI) version push for npm package

### 0.0.3-alpha.2 (2025-02-06)
- (FI) Removed test logic (will get implemented later)

### 0.0.3-alpha.1 (2025-02-06)
- (FI) Implemented rough logic

### 0.0.3-alpha.0 (2025-02-05)
- (FI) More things for automated deploy

### 0.0.2
- (FI) Just some things for Github actions

### 0.0.1
- (FI) initial release

## License

MIT License

Copyright (c) 2025 Ferry Israel <israel@fi-lan.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
