"""
Unit tests for FalconEye FPV - Virtual Camera Gimbal & Digital Zoom
"""

import unittest
from falconeye_perception.virtual_gimbal import VirtualGimbal

class TestVirtualGimbal(unittest.TestCase):
    def setUp(self):
        self.gimbal = VirtualGimbal(max_zoom=4.0, target_desired_area=0.04)

    def test_default_state(self):
        self.assertEqual(self.gimbal.gimbal_mode, "FPV_RAW")
        self.assertEqual(self.gimbal.current_zoom, 1.0)
        self.assertFalse(self.gimbal.auto_zoom_enabled)

    def test_raw_fpv_mode(self):
        transform = self.gimbal.compute_gimbal_transform(
            drone_roll_deg=15.0,
            drone_pitch_deg=-5.0,
            target_center_norm=(0.7, 0.3)
        )
        self.assertEqual(transform['rotation_correction_deg'], 0.0)
        self.assertEqual(transform['offset_x_norm'], 0.0)
        self.assertEqual(transform['offset_y_norm'], 0.0)
        self.assertEqual(transform['zoom_factor'], 1.0)

    def test_horizon_locked_mode(self):
        self.gimbal.set_gimbal_mode("HORIZON_LOCKED")
        transform = self.gimbal.compute_gimbal_transform(
            drone_roll_deg=22.5,
            drone_pitch_deg=10.0,
            target_center_norm=(0.7, 0.3)
        )
        # Should counter-rotate roll angle to level horizon
        self.assertEqual(transform['rotation_correction_deg'], 22.5)
        self.assertEqual(transform['offset_x_norm'], 0.0)
        self.assertEqual(transform['offset_y_norm'], 0.0)

    def test_target_centric_mode(self):
        self.gimbal.set_gimbal_mode("TARGET_CENTRIC")
        transform = self.gimbal.compute_gimbal_transform(
            drone_roll_deg=-12.0,
            drone_pitch_deg=8.0,
            target_center_norm=(0.65, 0.40)
        )
        # Counter-rotates roll and shifts offset to center target (0.5, 0.5)
        self.assertEqual(transform['rotation_correction_deg'], -12.0)
        self.assertAlmostEqual(transform['offset_x_norm'], 0.15, places=5)
        self.assertAlmostEqual(transform['offset_y_norm'], -0.10, places=5)

    def test_manual_zoom_limits(self):
        self.gimbal.set_manual_zoom(2.5)
        self.assertEqual(self.gimbal.current_zoom, 2.5)

        # Exceed max zoom
        self.gimbal.set_manual_zoom(10.0)
        self.assertEqual(self.gimbal.current_zoom, 4.0)

        # Below 1.0x
        self.gimbal.set_manual_zoom(0.5)
        self.assertEqual(self.gimbal.current_zoom, 1.0)

    def test_auto_zoom_scaling(self):
        # Target area is 0.01 (small distant target)
        # target_desired_area = 0.04
        # scale = sqrt(0.04 / 0.01) = 2.0
        zoom = self.gimbal.compute_auto_zoom(target_bbox_area=0.01, dt=1.0)
        # With exponential smoothing, zoom approaches 2.0
        self.assertGreater(zoom, 1.5)
        self.assertLessEqual(zoom, 2.0)

        # Run multiple steps to ensure convergence
        for _ in range(10):
            zoom = self.gimbal.compute_auto_zoom(target_bbox_area=0.01, dt=0.2)
        self.assertAlmostEqual(zoom, 2.0, places=2)

    def test_auto_zoom_clamping(self):
        # Extremely small target (e.g. 0.00001)
        for _ in range(10):
            zoom = self.gimbal.compute_auto_zoom(target_bbox_area=0.0001, dt=0.5)
        self.assertLessEqual(zoom, 4.0)

if __name__ == '__main__':
    unittest.main()
