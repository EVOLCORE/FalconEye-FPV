# FalconEye FPV

> **Autonomous AI FPV Drone, Electronic Situational Picture (ESP) & Resilient Multi-Provider Network System**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![ROS 2: Jazzy / Humble](https://img.shields.io/badge/ROS%202-Jazzy%20%7C%20Humble-green.svg)](https://docs.ros.org/)
[![Flight Stack: PX4](https://img.shields.io/badge/Flight%20Stack-PX4%20Autopilot-orange.svg)](https://px4.io/)
[![Edge AI: YOLO11 + TensorRT](https://img.shields.io/badge/Edge%20AI-YOLO11%20%7C%20TensorRT-purple.svg)](https://github.com/ultralytics/ultralytics)

---

## 🦅 System Overview

**FalconEye FPV** is an enterprise-grade, modular autonomous FPV drone ecosystem designed from the ground up to combine:
1. **Low-Latency Edge AI Perception:** Real-time aerial detection and continuous multi-object tracking (vehicles, people, boats, custom targets) powered by YOLO11-Aerial with small-object (P2) heads and ByteTrack ego-motion compensation.
2. **Visual Guidance & Autonomy:** Image-Based Visual Servoing (IBVS) flight controller converting camera pixel tracking offsets directly into smooth velocity setpoints for high-speed dynamic tracking, orbit, and interception.
3. **Operator ESP (Electronic Situational Picture):** Full situational awareness station with an Augmented Reality (AR) Video HUD, 2D/3D tactical map, camera ground footprint projection, target GPS breadcrumbs, and "Click-to-Track" reticle targeting.
4. **FalconNet Multi-Link Redundancy:** Resilient multi-provider network engine bonding and dynamically failing over across **Ad-Hoc RF Mesh (802.11s / BATMAN-adv)**, **Tactical Wi-Fi 6**, **Cellular 4G/5G LTE**, and **Satellite Backhaul (Starlink)** with 3-tier Quality-of-Service (QoS).

---

## 🏛️ High-Level Architecture

```
                    +------------------------------------+
                    |   FALCONEYE ESP GROUND STATION     |
                    |   • AR Video HUD (<40ms WebRTC)    |
                    |   • 2D/3D Tactical Map (MapLibre)  |
                    |   • "Click-to-Track" Target Lock   |
                    +-----------------+------------------+
                                      ▲
                                      | FalconNet Multi-Link
                                      | [Mesh | Wi-Fi 6 | 4G/5G | Starlink]
                                      v
+-------------------------------------------------------------------------+
|                  FALCONEYE ONBOARD COMPANION COMPUTER                   |
|                                                                         |
|  [FalconNet Router & QoS Engine]  <---> [Low-Latency GStreamer WebRTC]  |
|                                                     |                   |
|  [Modular AI Perception Engine]                     v                   |
|  (TensorRT / Hailo-RT / ONNX)    <---> [Zero-Copy Frame Pipeline]       |
|                |                                                        |
|                v                                                        |
|  [ByteTrack + IMU Motion Compensation]                                  |
|                |                                                        |
|                v                                                        |
|  [Visual Servoing (IBVS) & Autonomy State Machine]                      |
+------------------------------------+------------------------------------+
                                     | UART (921,600 baud) / USB
                                     v
+-------------------------------------------------------------------------+
|                FLIGHT CONTROLLER (PX4 Autopilot / NuttX)                |
|  • EKF2 State Estimator (GPS, Baro, IMU)                                |
|  • High-Rate Motor Mixer (1 - 8 kHz DShot)                              |
|  • Hardware Safety Failsafes & Immediate RC Manual Override             |
+-------------------------------------------------------------------------+
```

---

## 📂 Repository Monorepo Structure

```
falconeye-fpv/
├── docker/                 # Containerized dev & runtime environments (ROS 2, SITL, PyTorch)
├── falconeye_net/          # FalconNet multi-provider network engine (Zenoh, WireGuard, Mesh)
├── falconeye_esp/          # Operator ESP Ground Station (React, WebGL Map, WebRTC AR HUD)
├── simulation/             # Gazebo worlds, FPV airframe models, automated SITL scripts
├── src/                    # ROS 2 Onboard Packages:
│   ├── falconeye_interfaces/   # Custom ROS 2 messages (TargetTrack, DetectionArray, etc.)
│   ├── falconeye_perception/   # Edge AI detection & tracking nodes
│   ├── falconeye_guidance/     # Visual servoing (IBVS) & flight state machine
│   ├── falconeye_telemetry/    # MAVLink / Zenoh state publisher
│   └── falconeye_video/        # Low-latency GStreamer pipeline
├── ai_models/              # Aerial fine-tuning recipes, VisDrone/DOTA configs, TensorRT export
└── tools/                  # Hardware calibration, latency benchmarks, and serial test tools
```

---

## 🚀 Quick Start (Development & Simulation)

### Prerequisites
- Node.js 20+
- Python 3.10+
- ROS 2 (Jazzy / Humble) or Docker
- PX4 Autopilot SITL + Gazebo Harmonic

### 1. Launch Operator ESP Interface
```bash
cd falconeye_esp
npm install
npm run dev
```

### 2. Run Simulation & Companion Stack
```bash
# Build ROS 2 workspace
colcon build --symlink-install
source install/setup.bash

# Launch full simulation stack
ros2 launch falconeye_bringup sitl_simulation.launch.py
```
