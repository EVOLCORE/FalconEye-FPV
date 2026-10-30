"""
FalconEye FPV - Optical Flow & GPS-Denied Anti-Jamming Navigation
Estimates relative drone ground speed and position displacement using camera optical flow
and gyro derotation when GPS satellites are jammed, spoofed, or unavailable.
"""

import math
from typing import Tuple

class OpticalFlowEstimator:
    """Calculates ground velocity and integrates visual dead-reckoning displacement."""
    def __init__(self, camera_fov_deg: float = 80.0):
        self.fov_rad = math.radians(camera_fov_deg)
        self.pos_x = 0.0
        self.pos_y = 0.0
        self.velocity_x = 0.0
        self.velocity_y = 0.0
        self.last_update_time = 0.0

    def update(
        self,
        flow_dx_norm: float,         # Normalized optical flow shift along X [-1.0, 1.0]
        flow_dy_norm: float,         # Normalized optical flow shift along Y [-1.0, 1.0]
        altitude_meters: float,      # Height above ground from sonar/LiDAR/baro
        gyro_roll_rad_s: float,      # Gyro roll rate (rad/s)
        gyro_pitch_rad_s: float,     # Gyro pitch rate (rad/s)
        dt: float
    ) -> Tuple[float, float, float, float]:
        """
        Derotates optical flow and converts to true metric velocity:
        Returns: (pos_x_m, pos_y_m, velocity_x_mps, velocity_y_mps)
        """
        if dt <= 0.0001 or altitude_meters <= 0.1:
            return self.pos_x, self.pos_y, 0.0, 0.0

        # Derotate flow: subtract apparent motion caused by camera tilting
        # Angular displacement = gyro_rate * dt / FOV
        derotated_flow_x = flow_dx_norm - (gyro_roll_rad_s * dt) / self.fov_rad
        derotated_flow_y = flow_dy_norm - (gyro_pitch_rad_s * dt) / self.fov_rad

        # Ground footprint dimension at current altitude
        ground_span_m = 2.0 * altitude_meters * math.tan(self.fov_rad / 2.0)

        # True metric ground displacement
        dist_x = derotated_flow_x * ground_span_m
        dist_y = derotated_flow_y * ground_span_m

        # Instantaneous velocity (with low-pass filter for noise rejection)
        inst_vx = dist_x / dt
        inst_vy = dist_y / dt

        alpha = 0.4
        self.velocity_x = alpha * inst_vx + (1.0 - alpha) * self.velocity_x
        self.velocity_y = alpha * inst_vy + (1.0 - alpha) * self.velocity_y

        # Integrate relative dead-reckoning position
        self.pos_x += dist_x
        self.pos_y += dist_y

        return self.pos_x, self.pos_y, self.velocity_x, self.velocity_y

    def reset_position(self, x: float = 0.0, y: float = 0.0):
        self.pos_x = x
        self.pos_y = y
        self.velocity_x = 0.0
        self.velocity_y = 0.0
