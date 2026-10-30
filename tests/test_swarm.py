"""
Unit tests for FalconSwarm Multi-Drone Target Sharing & Airborne Mesh Relaying.
Uses Python standard library unittest.
"""

import unittest
import sys
import os

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'falconeye_swarm')))

from swarm_manager import FalconSwarmManager, haversine_distance_meters

class TestFalconSwarm(unittest.TestCase):
    def setUp(self):
        self.swarm = FalconSwarmManager(fusion_distance_threshold_m=15.0)
        # Register two drones in the swarm
        self.d1 = self.swarm.register_drone(drone_id=1, callsign="Falcon-1")
        self.d2 = self.swarm.register_drone(drone_id=2, callsign="Falcon-2")

    def test_haversine_distance(self):
        # Coordinates approx 111 meters apart in latitude (0.001 deg ~ 111m)
        dist = haversine_distance_meters(45.0, 10.0, 45.001, 10.0)
        self.assertAlmostEqual(dist, 111.19, delta=5.0)

    def test_multi_drone_target_fusion(self):
        # Drone 1 spots a vehicle at base GPS
        base_lat, base_lon = 45.123456, 9.654321
        t1 = self.swarm.report_sighting(
            drone_id=1,
            class_name="car",
            lat=base_lat,
            lon=base_lon,
            confidence=0.92
        )
        self.assertEqual(len(self.swarm.targets), 1)
        orig_id = t1.global_id

        # Drone 2 spots the same vehicle 6 meters away
        offset_lat = base_lat + 0.00005 # ~5.5 meters offset
        t2 = self.swarm.report_sighting(
            drone_id=2,
            class_name="car",
            lat=offset_lat,
            lon=base_lon,
            confidence=0.95
        )

        # Must fuse into the SAME global target ID!
        self.assertEqual(len(self.swarm.targets), 1)
        self.assertEqual(t2.global_id, orig_id)
        self.assertEqual(t2.sightings_count, 2)

    def test_airborne_mesh_relay_selection(self):
        # Set drone positions (100 meters apart)
        self.d1.update_status(lat=45.0, lon=10.0, alt=60.0, battery=85.0, link_quality=90) # Flying high with great link
        self.d2.update_status(lat=45.001, lon=10.0, alt=15.0, battery=70.0, link_quality=15) # Low altitude in valley, link dropped!

        # Run relay topology update
        self.swarm.update_relay_topology()

        # Drone 1 has direct link to pilot
        self.assertEqual(self.d1.relay_drone_id, 0)
        # Drone 2 must automatically select Drone 1 as airborne flying relay!
        self.assertEqual(self.d2.relay_drone_id, 1)

    def test_target_handoff_between_drones(self):
        # Register target being tracked by Drone 1
        target = self.swarm.report_sighting(1, "truck", 45.0, 10.0, 0.9)
        target.tracking_drone_id = 1
        target.is_locked = True
        self.d1.locked_target_id = target.global_id
        self.d1.role = "TRACKING"

        self.d2.update_status(lat=45.0, lon=10.0, alt=40.0, battery=90.0, link_quality=80)

        # Execute handoff to Drone 2
        success = self.swarm.request_target_handoff(
            global_target_id=target.global_id,
            from_drone_id=1,
            to_drone_id=2
        )
        self.assertTrue(success)

        # Verify Drone 2 is now tracking
        self.assertEqual(target.tracking_drone_id, 2)
        self.assertEqual(self.d2.locked_target_id, target.global_id)
        self.assertEqual(self.d2.role, "TRACKING")

        # Verify Drone 1 has been freed up
        self.assertEqual(self.d1.locked_target_id, 0)
        self.assertEqual(self.d1.role, "SCOUT")

if __name__ == '__main__':
    unittest.main()
