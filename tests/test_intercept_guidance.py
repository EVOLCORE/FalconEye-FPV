"""
Unit tests for FalconEye Target Intercept & Collision Guidance (Proportional Navigation).
Uses Python standard library unittest.
"""

import unittest
import sys
import os

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'falconeye_guidance')))

from falconeye_guidance.intercept_guidance import InterceptGuidance

class TestInterceptGuidance(unittest.TestCase):
    def setUp(self):
        self.guidance = InterceptGuidance(navigation_gain=3.0, max_drone_speed_mps=30.0)

    def test_stationary_target_intercept(self):
        # Drone at origin (0, 0, 10), target stationary 60m ahead at (60, 0, 0)
        drone_pos = (0.0, 0.0, 10.0)
        drone_vel = (15.0, 0.0, 0.0)
        target_pos = (60.0, 0.0, 0.0)
        target_vel = (0.0, 0.0, 0.0)

        res = self.guidance.compute_lead_intercept(drone_pos, drone_vel, target_pos, target_vel)
        
        # Verify distance ~ 60.8m
        self.assertAlmostEqual(res['distance_meters'], 60.827, places=1)
        # Verify drone is commanded to fly forward (positive vx) and downward (negative vz)
        self.assertGreater(res['desired_vx'], 25.0)
        self.assertLess(res['desired_vz'], 0.0)
        self.assertGreater(res['time_to_impact_sec'], 0.5)

    def test_moving_target_lead_point(self):
        # Target moving across the path (vy = 10 m/s)
        drone_pos = (0.0, 0.0, 0.0)
        drone_vel = (20.0, 0.0, 0.0)
        target_pos = (50.0, 0.0, 0.0)
        target_vel = (0.0, 10.0, 0.0) # Moving right at 10 m/s

        res = self.guidance.compute_lead_intercept(drone_pos, drone_vel, target_pos, target_vel)
        
        # Target is moving right, so impact_y must lead into the future (positive impact_y)
        self.assertGreater(res['impact_y'], 0.0)
        # Desired vy must turn right towards lead point
        self.assertGreater(res['desired_vy'], 0.0)

    def test_terminal_impact_threshold(self):
        # Drone within 0.3m of target
        drone_pos = (10.0, 10.0, 5.0)
        target_pos = (10.2, 10.0, 5.0) # 0.2m away

        res = self.guidance.compute_lead_intercept(
            drone_pos, (30.0, 0.0, 0.0),
            target_pos, (0.0, 0.0, 0.0)
        )
        self.assertTrue(res['impact_imminent'])
        self.assertEqual(res['time_to_impact_sec'], 0.0)

if __name__ == '__main__':
    unittest.main()
