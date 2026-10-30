"""
Unit tests for FalconEye Optical Flow & GPS-Denied Navigation Estimator.
Uses Python standard library unittest.
"""

import unittest
import sys
import os

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'falconeye_guidance')))

from falconeye_guidance.optical_flow_estimator import OpticalFlowEstimator

class TestOpticalFlowEstimator(unittest.TestCase):
    def setUp(self):
        self.estimator = OpticalFlowEstimator(camera_fov_deg=80.0)

    def test_pure_camera_rotation_derotation(self):
        # When a drone pitches/rolls without translating forward, the gyro derotation should cancel out flow
        # Optical flow shift exactly equals gyro angular displacement
        dt = 0.05
        gyro_roll = 1.0  # 1 rad/s
        fov_rad = self.estimator.fov_rad
        # Apparent flow due to camera roll alone
        flow_dx = (gyro_roll * dt) / fov_rad

        pos_x, pos_y, vx, vy = self.estimator.update(
            flow_dx_norm=flow_dx,
            flow_dy_norm=0.0,
            altitude_meters=10.0,
            gyro_roll_rad_s=gyro_roll,
            gyro_pitch_rad_s=0.0,
            dt=dt
        )
        # Net ground velocity should be approximately zero because drone only tilted!
        self.assertAlmostEqual(vx, 0.0, places=3)
        self.assertAlmostEqual(pos_x, 0.0, places=3)

    def test_true_ground_translation(self):
        # Zero gyro rotation (drone flying level), ground moving underneath camera
        dt = 0.1
        altitude = 15.0
        flow_dx = 0.05  # True ground translation shift

        pos_x, pos_y, vx, vy = self.estimator.update(
            flow_dx_norm=flow_dx,
            flow_dy_norm=0.0,
            altitude_meters=altitude,
            gyro_roll_rad_s=0.0,
            gyro_pitch_rad_s=0.0,
            dt=dt
        )
        # Must report positive forward ground velocity and position displacement
        self.assertGreater(vx, 0.0)
        self.assertGreater(pos_x, 0.0)

    def test_reset_position(self):
        self.estimator.pos_x = 55.0
        self.estimator.pos_y = 30.0
        self.estimator.reset_position()
        self.assertEqual(self.estimator.pos_x, 0.0)
        self.assertEqual(self.estimator.pos_y, 0.0)

if __name__ == '__main__':
    unittest.main()
