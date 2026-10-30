"""
FalconEye FPV - Autonomous Target Intercept & Collision Guidance
Implements Proportional Navigation (PN) and lead-point collision trajectory calculations
to fly the drone directly into moving or stationary targets.
"""

import math
from typing import Tuple, Dict, Optional

class InterceptGuidance:
    """Calculates lead-collision flight trajectories and time-to-impact for target interception."""
    def __init__(self, navigation_gain: float = 3.0, max_drone_speed_mps: float = 35.0):
        self.N = navigation_gain  # Navigation constant (typically 3.0 - 4.0)
        self.max_speed = max_drone_speed_mps

    def compute_lead_intercept(
        self,
        drone_pos: Tuple[float, float, float],    # (x, y, z) in meters
        drone_vel: Tuple[float, float, float],    # (vx, vy, vz)
        target_pos: Tuple[float, float, float],   # (x, y, z)
        target_vel: Tuple[float, float, float]    # (vx, vy, vz)
    ) -> Dict[str, float]:
        """
        Solves the collision triangle to determine:
        - time_to_impact_sec
        - predicted_impact_pos (x, y, z)
        - desired_velocity (vx, vy, vz)
        - closing_speed_mps
        - distance_meters
        """
        dx = target_pos[0] - drone_pos[0]
        dy = target_pos[1] - drone_pos[1]
        dz = target_pos[2] - drone_pos[2]
        dist = math.sqrt(dx * dx + dy * dy + dz * dz)

        if dist < 0.5:
            # Terminal impact threshold reached
            return {
                'distance_meters': dist,
                'time_to_impact_sec': 0.0,
                'closing_speed_mps': self.max_speed,
                'desired_vx': 0.0,
                'desired_vy': 0.0,
                'desired_vz': 0.0,
                'impact_x': target_pos[0],
                'impact_y': target_pos[1],
                'impact_z': target_pos[2],
                'impact_imminent': True
            }

        # Relative velocity vector
        rel_vx = drone_vel[0] - target_vel[0]
        rel_vy = drone_vel[1] - target_vel[1]
        rel_vz = drone_vel[2] - target_vel[2]

        # Closing velocity (projection of relative velocity along line of sight)
        los_ux = dx / dist
        los_uy = dy / dist
        los_uz = dz / dist
        closing_speed = rel_vx * los_ux + rel_vy * los_uy + rel_vz * los_uz

        # If opening or stationary, estimate closing speed using drone max speed
        effective_closing_speed = max(5.0, closing_speed if closing_speed > 2.0 else self.max_speed * 0.8)
        time_to_go = dist / effective_closing_speed

        # Predicted impact point (lead target position)
        impact_x = target_pos[0] + target_vel[0] * time_to_go
        impact_y = target_pos[1] + target_vel[1] * time_to_go
        impact_z = target_pos[2] + target_vel[2] * time_to_go

        # Desired velocity vector pointing directly from drone to predicted impact point
        vec_x = impact_x - drone_pos[0]
        vec_y = impact_y - drone_pos[1]
        vec_z = impact_z - drone_pos[2]
        vec_len = math.sqrt(vec_x * vec_x + vec_y * vec_y + vec_z * vec_z)

        if vec_len > 0.001:
            cmd_vx = (vec_x / vec_len) * self.max_speed
            cmd_vy = (vec_y / vec_len) * self.max_speed
            cmd_vz = (vec_z / vec_len) * self.max_speed
        else:
            cmd_vx, cmd_vy, cmd_vz = 0.0, 0.0, 0.0

        return {
            'distance_meters': dist,
            'time_to_impact_sec': time_to_go,
            'closing_speed_mps': effective_closing_speed,
            'desired_vx': cmd_vx,
            'desired_vy': cmd_vy,
            'desired_vz': cmd_vz,
            'impact_x': impact_x,
            'impact_y': impact_y,
            'impact_z': impact_z,
            'impact_imminent': (dist < 3.0)
        }
