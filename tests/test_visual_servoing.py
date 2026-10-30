"""
Unit tests for FalconEye Visual Servoing Controller & PID math.
Uses Python standard library unittest.
"""

import unittest
import sys
import os

# Add package to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'falconeye_guidance')))

from falconeye_guidance.visual_servoing import PIDController, VisualServoingController

class TestFalconEyeVisualServoing(unittest.TestCase):
    def test_pid_clamping_and_convergence(self):
        # Setup PID with output clamped to [-5.0, 5.0]
        pid = PIDController(kp=2.0, ki=0.1, kd=0.0, output_min=-5.0, output_max=5.0)
        
        # Large positive error should clamp at max output
        out = pid.update(error=10.0, dt=0.1)
        self.assertEqual(out, 5.0)

        # Large negative error should clamp at min output
        out_neg = pid.update(error=-10.0, dt=0.1)
        self.assertEqual(out_neg, -5.0)

        # Zero error should yield small/zero output
        pid.reset()
        out_zero = pid.update(error=0.0, dt=0.1)
        self.assertAlmostEqual(out_zero, 0.0, places=3)

    def test_visual_servoing_steering_directions(self):
        servoing = VisualServoingController(target_area=0.04)

        # 1. Target is centered on screen: bbox=(0.4, 0.4, 0.6, 0.6)
        # Center = (0.5, 0.5), Area = 0.2 * 0.2 = 0.04 (Matches target_area)
        vx, vy, vz, yaw_rate, ex, ey, ea = servoing.compute_setpoints(
            bbox=(0.4, 0.4, 0.6, 0.6),
            dt=0.05
        )
        self.assertAlmostEqual(ex, 0.0, places=4)
        self.assertAlmostEqual(ey, 0.0, places=4)
        self.assertAlmostEqual(ea, 0.0, places=4)
        self.assertAlmostEqual(yaw_rate, 0.0, places=2)

        # 2. Target is to the RIGHT of the screen (center_x = 0.8)
        # Drone must turn RIGHT (positive yaw rate)
        servoing.reset()
        vx, vy, vz, yaw_rate, ex, ey, ea = servoing.compute_setpoints(
            bbox=(0.7, 0.4, 0.9, 0.6),
            dt=0.05
        )
        self.assertGreater(ex, 0.0) # Error is positive
        self.assertGreater(yaw_rate, 0.0) # Positive yaw to turn right towards target!

        # 3. Target is to the LEFT of the screen (center_x = 0.2)
        # Drone must turn LEFT (negative yaw rate)
        servoing.reset()
        vx, vy, vz, yaw_rate, ex, ey, ea = servoing.compute_setpoints(
            bbox=(0.1, 0.4, 0.3, 0.6),
            dt=0.05
        )
        self.assertLess(ex, 0.0)
        self.assertLess(yaw_rate, 0.0) # Negative yaw to turn left towards target!

        # 4. Target is FAR AWAY (tiny area: 0.05 * 0.05 = 0.0025 << 0.04)
        # Drone must accelerate FORWARD (positive vx)
        servoing.reset()
        vx, vy, vz, yaw_rate, ex, ey, ea = servoing.compute_setpoints(
            bbox=(0.475, 0.475, 0.525, 0.525),
            dt=0.05
        )
        self.assertGreater(ea, 0.0) # Target area error is positive
        self.assertGreater(vx, 0.0) # Drone accelerates forward to close distance!

if __name__ == '__main__':
    unittest.main()
