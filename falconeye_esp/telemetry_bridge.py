"""
FalconEye FPV - Ground Station Telemetry & WebSocket Bridge
Provides real-time bidirectional communication between the Drone Brain (ROS 2 / MAVLink / FalconNet)
and the Operator ESP Ground Station web client.
"""

import asyncio
import json
import time
import math
import sys

# Optional import of websockets
try:
    import websockets
except ImportError:
    websockets = None

class FalconEyeTelemetryBridge:
    def __init__(self, host: str = "0.0.0.0", port: int = 8080):
        self.host = host
        self.port = port
        self.connected_clients = set()
        self.designated_track_id = None
        self.armed = False
        self.flight_mode = "POS_HOLD"
        self.start_time = time.time()

    async def register(self, websocket):
        self.connected_clients.add(websocket)
        print(f"📡 Client connected: {websocket.remote_address}. Total clients: {len(self.connected_clients)}")

    async def unregister(self, websocket):
        self.connected_clients.remove(websocket)
        print(f"🔌 Client disconnected. Total clients: {len(self.connected_clients)}")

    async def broadcast_loop(self):
        """Simulates 30Hz high-rate telemetry and perception stream broadcast."""
        while True:
            if self.connected_clients:
                now = time.time()
                t = now - self.start_time

                # 1. Telemetry State
                telemetry = {
                    "armed": self.armed,
                    "flightMode": self.flight_mode,
                    "batteryPct": max(15, int(95 - (t * 0.05))),
                    "batteryVoltage": 22.8 - (t * 0.005),
                    "altitudeMeters": 18.5 + 2.0 * math.sin(t * 0.3),
                    "groundSpeedMps": 12.0 + 3.0 * math.cos(t * 0.5),
                    "headingDeg": (45.0 + t * 2.0) % 360.0,
                    "pitchDeg": -3.5 + 2.0 * math.sin(t * 1.5),
                    "rollDeg": 1.8 * math.cos(t * 1.8),
                    "gpsFix": "RTK_FIXED",
                    "satellites": 26
                }

                # 2. Dynamic Targets
                # Vehicle cruising
                car_cx = 0.5 + 0.2 * math.sin(t * 0.6)
                car_cy = 0.52 + 0.07 * math.cos(t * 0.4)
                w, h = 0.13, 0.085

                tracks = [
                    {
                        "trackId": 101,
                        "className": "vehicle",
                        "confidence": 0.94,
                        "state": "TRACKING",
                        "bbox": {
                            "xMin": car_cx - w/2,
                            "yMin": car_cy - h/2,
                            "xMax": car_cx + w/2,
                            "yMax": car_cy + h/2
                        },
                        "velocityX": 0.03 * math.cos(t * 0.6),
                        "velocityY": -0.015 * math.sin(t * 0.4),
                        "distanceMeters": 28.5 + 5.0 * math.sin(t * 0.3),
                        "isDesignated": (self.designated_track_id == 101)
                    },
                    {
                        "trackId": 102,
                        "className": "person",
                        "confidence": 0.86,
                        "state": "TRACKING",
                        "bbox": {
                            "xMin": 0.75,
                            "yMin": 0.58,
                            "xMax": 0.79,
                            "yMax": 0.68
                        },
                        "velocityX": 0.0,
                        "velocityY": 0.0,
                        "distanceMeters": 42.0,
                        "isDesignated": (self.designated_track_id == 102)
                    }
                ]

                # 3. FalconNet Multi-Provider Status
                network = {
                    "activeTransport": "WIFI6",
                    "wifi6": {"connected": True, "rssi": -55, "latencyMs": 12, "throughputKbps": 52000},
                    "mesh": {"connected": True, "latencyMs": 19, "details": "1-Hop Ground Relay"},
                    "cellular": {"connected": True, "latencyMs": 34, "details": "5G SA Standby"},
                    "starlink": {"connected": True, "latencyMs": 42, "details": "Satcom Ready"},
                    "packetLossPct": 0.05
                }

                payload = json.dumps({
                    "type": "STATE_UPDATE",
                    "timestamp": now,
                    "telemetry": telemetry,
                    "tracks": tracks,
                    "network": network,
                    "designatedTrackId": self.designated_track_id
                })

                # Broadcast to all connected clients
                await asyncio.gather(
                    *[client.send(payload) for client in self.connected_clients],
                    return_exceptions=True
                )

            await asyncio.sleep(0.033) # 30 Hz

    async def handle_client_message(self, websocket, message_str: str):
        """Processes commands coming from the ESP Operator HUD."""
        try:
            data = json.loads(message_str)
            msg_type = data.get("type")

            if msg_type == "DESIGNATE_TARGET":
                self.designated_track_id = data.get("trackId")
                self.flight_mode = "OFFBOARD"
                print(f"🎯 Target Locked by Operator: #{self.designated_track_id}")

            elif msg_type == "BREAK_LOCK":
                print(f"🔓 Target Lock Released: #{self.designated_track_id}")
                self.designated_track_id = None
                self.flight_mode = "POS_HOLD"

            elif msg_type == "TOGGLE_ARM":
                self.armed = not self.armed
                print(f"⚡ Armed State Changed: {self.armed}")

            elif msg_type == "SET_MODE":
                self.flight_mode = data.get("mode", "POS_HOLD")
                print(f"🕹️ Flight Mode Set: {self.flight_mode}")

        except Exception as e:
            print(f"Error handling message: {e}")

    async def handler(self, websocket, path):
        await self.register(websocket)
        try:
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        finally:
            await self.unregister(websocket)

    async def start(self):
        if websockets is None:
            print("[WARN] 'websockets' library not installed. Run: pip install websockets")
            return

        print(f"🦅 FalconEye Telemetry Bridge Server running on ws://{self.host}:{self.port}")
        async with websockets.serve(self.handler, self.host, self.port):
            await self.broadcast_loop()

if __name__ == "__main__":
    bridge = FalconEyeTelemetryBridge()
    try:
        asyncio.run(bridge.start())
    except KeyboardInterrupt:
        print("\nShutdown bridge.")
