"""
Unit tests for FalconEye Geofencing & Killbox Boundary Enforcement.
Uses Python standard library unittest.
"""

import unittest
import sys
import os

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'falconeye_guidance')))

from falconeye_guidance.geofence_manager import GeofenceManager

class TestGeofenceManager(unittest.TestCase):
    def setUp(self):
        self.mgr = GeofenceManager()
        # Define a square Killbox around (45.0, 10.0) -> bounds [44.9, 45.1] x [9.9, 10.1]
        self.killbox_poly = [
            (44.9, 9.9),
            (45.1, 9.9),
            (45.1, 10.1),
            (44.9, 10.1)
        ]
        self.mgr.add_zone("KB_1", "KILLBOX", self.killbox_poly)

    def test_point_in_polygon_ray_casting(self):
        # Center of polygon (inside)
        self.assertTrue(GeofenceManager.point_in_polygon((45.0, 10.0), self.killbox_poly))
        # Point far outside
        self.assertFalse(GeofenceManager.point_in_polygon((46.0, 10.0), self.killbox_poly))

    def test_killbox_authorization(self):
        # Target located inside killbox -> AUTHORIZED
        inside_target = (45.02, 10.01)
        self.assertTrue(self.mgr.is_target_authorized_in_killbox(inside_target))

        # Target located outside killbox -> REFUSED / UNAUTHORIZED
        outside_target = (45.25, 10.0)
        self.assertFalse(self.mgr.is_target_authorized_in_killbox(outside_target))

    def test_keep_out_zone_breach(self):
        # Define a restricted friendly base zone
        restricted_base = [
            (44.0, 9.0),
            (44.2, 9.0),
            (44.2, 9.2),
            (44.0, 9.2)
        ]
        self.mgr.add_zone("BASE_ALPHA", "KEEP_OUT", restricted_base)

        # Drone flying inside restricted zone -> BREACH
        drone_inside = (44.1, 9.1)
        self.assertTrue(self.mgr.is_drone_in_keep_out_zone(drone_inside))

        # Drone flying outside restricted zone -> SAFE
        drone_outside = (45.0, 10.0)
        self.assertFalse(self.mgr.is_drone_in_keep_out_zone(drone_outside))

if __name__ == '__main__':
    unittest.main()
