"""
FalconEye FPV - FalconSwarm Multi-Drone Coordination & Shared Network Module
Manages airborne mesh relaying, fused global target registries, and target handoffs between drones.
"""

import math
import time
from typing import Dict, List, Optional, Tuple

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates ground distance in meters between two GPS coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class SwarmDrone:
    """Represents a sister drone operating in the airborne mesh."""
    def __init__(self, drone_id: int, callsign: str):
        self.drone_id = drone_id
        self.callsign = callsign
        self.is_online = True
        self.battery_pct = 100.0
        self.latitude = 0.0
        self.longitude = 0.0
        self.altitude_meters = 0.0
        self.heading_deg = 0.0
        self.speed_mps = 0.0
        
        # Link state to pilot
        self.direct_link_quality = 100  # 0 - 100%
        self.relay_drone_id = 0         # 0 = direct connection
        
        # Current mission task
        self.role = "SCOUT"
        self.locked_target_id = 0
        self.last_seen_time = time.time()

    def update_status(self, lat: float, lon: float, alt: float, battery: float, link_quality: int):
        self.latitude = lat
        self.longitude = lon
        self.altitude_meters = alt
        self.battery_pct = battery
        self.direct_link_quality = link_quality
        self.last_seen_time = time.time()


class GlobalTarget:
    """A fused target identified and shared across the drone swarm."""
    def __init__(self, global_id: int, class_name: str, lat: float, lon: float, spotting_drone_id: int):
        self.global_id = global_id
        self.class_name = class_name
        self.latitude = lat
        self.longitude = lon
        self.altitude_msl = 0.0
        self.confidence = 0.9
        self.speed_mps = 0.0
        
        self.spotting_drone_id = spotting_drone_id
        self.tracking_drone_id = 0  # 0 = unassigned
        self.is_locked = False
        self.sightings_count = 1
        self.last_updated = time.time()

    def update_position(self, new_lat: float, new_lon: float, confidence: float, drone_id: int):
        now = time.time()
        dt = max(0.001, now - self.last_updated)
        dist = haversine_distance_meters(self.latitude, self.longitude, new_lat, new_lon)
        
        # Estimate ground speed
        if dt < 5.0:
            inst_speed = dist / dt
            self.speed_mps = 0.7 * self.speed_mps + 0.3 * inst_speed
            
        # Exponential smoothing on GPS position
        self.latitude = 0.6 * self.latitude + 0.4 * new_lat
        self.longitude = 0.6 * self.longitude + 0.4 * new_lon
        self.confidence = max(self.confidence, confidence)
        self.sightings_count += 1
        self.last_updated = now


class FalconSwarmManager:
    """Orchestrates multi-drone target sharing, relay routing, and handoffs."""
    def __init__(self, fusion_distance_threshold_m: float = 15.0):
        self.fusion_threshold = fusion_distance_threshold_m
        self.drones: Dict[int, SwarmDrone] = {}
        self.targets: Dict[int, GlobalTarget] = {}
        self._next_target_id = 200

    def register_drone(self, drone_id: int, callsign: str) -> SwarmDrone:
        drone = SwarmDrone(drone_id, callsign)
        self.drones[drone_id] = drone
        return drone

    def report_sighting(
        self,
        drone_id: int,
        class_name: str,
        lat: float,
        lon: float,
        confidence: float
    ) -> GlobalTarget:
        """
        Receives an object detection from any drone and fuses it into the global target registry.
        If a target of the same type exists within fusion_threshold meters, merges them.
        """
        # Search for existing nearby target of same class
        matched_target: Optional[GlobalTarget] = None
        min_dist = self.fusion_threshold

        for target in self.targets.values():
            if target.class_name == class_name:
                dist = haversine_distance_meters(target.latitude, target.longitude, lat, lon)
                if dist < min_dist:
                    min_dist = dist
                    matched_target = target

        if matched_target is not None:
            # Fuse sighting into existing target
            matched_target.update_position(lat, lon, confidence, drone_id)
            return matched_target
        else:
            # Create new shared global target
            new_id = self._next_target_id
            self._next_target_id += 1
            new_target = GlobalTarget(new_id, class_name, lat, lon, drone_id)
            self.targets[new_id] = new_target
            return new_target

    def update_relay_topology(self):
        """
        Airborne Mesh Sharing:
        If any drone loses direct line-of-sight to the pilot (quality < 25%),
        finds the closest airborne drone with good direct link (> 60%) to act as a flying relay.
        """
        for drone_id, drone in self.drones.items():
            if drone.direct_link_quality < 25:
                # Needs airborne relay!
                best_relay_id = 0
                best_distance = float('inf')

                for candidate_id, candidate in self.drones.items():
                    if candidate_id != drone_id and candidate.direct_link_quality >= 60:
                        dist = haversine_distance_meters(
                            drone.latitude, drone.longitude,
                            candidate.latitude, candidate.longitude
                        )
                        if dist < best_distance:
                            best_distance = dist
                            best_relay_id = candidate_id

                drone.relay_drone_id = best_relay_id
            else:
                # Direct link is clean
                drone.relay_drone_id = 0

    def request_target_handoff(
        self,
        global_target_id: int,
        from_drone_id: int,
        to_drone_id: int
    ) -> bool:
        """
        Hands off an active tracking lock from Drone A to Drone B.
        """
        target = self.targets.get(global_target_id)
        from_drone = self.drones.get(from_drone_id)
        to_drone = self.drones.get(to_drone_id)

        if not target or not from_drone or not to_drone:
            return False

        if not to_drone.is_online or to_drone.battery_pct < 20.0:
            return False # Receiver drone cannot accept

        # Execute smooth handoff
        target.tracking_drone_id = to_drone_id
        target.is_locked = True
        
        from_drone.locked_target_id = 0
        from_drone.role = "SCOUT"
        
        to_drone.locked_target_id = global_target_id
        to_drone.role = "TRACKING"
        return True
