"""
FalconEye FPV - Virtual Camera Gimbal & Digital Target Zoom Engine
Provides digital horizon leveling (roll/pitch stabilization without mechanical weight),
target-centric camera tracking, and dynamic auto-zoom based on target distance.
"""

import math
from typing import Tuple, Dict, Optional

class VirtualGimbal:
    """Manages electronic image stabilization (EIS) and digital zoom."""
    def __init__(self, max_zoom: float = 4.0, target_desired_area: float = 0.05):
        self.max_zoom = max_zoom
        self.target_desired_area = target_desired_area
        self.current_zoom = 1.0
        self.auto_zoom_enabled = False
        self.gimbal_mode = "FPV_RAW"  # 'FPV_RAW', 'HORIZON_LOCKED', 'TARGET_CENTRIC'

    def compute_auto_zoom(self, target_bbox_area: float, dt: float) -> float:
        """
        Calculates optimal zoom factor to keep distant targets sharp and easily identifiable.
        As a target moves far away (area drops), zoom smoothly increases up to max_zoom.
        """
        if target_bbox_area <= 0.0001:
            desired_zoom = 1.0
        else:
            # Scale zoom inversely proportional to target area
            scale = math.sqrt(self.target_desired_area / target_bbox_area)
            desired_zoom = max(1.0, min(self.max_zoom, scale))

        # Exponential smoothing filter for jitter-free zoom transitions
        alpha = min(1.0, 5.0 * dt) if dt > 0.001 else 0.2
        self.current_zoom = (1.0 - alpha) * self.current_zoom + alpha * desired_zoom
        return self.current_zoom

    def compute_gimbal_transform(
        self,
        drone_roll_deg: float,
        drone_pitch_deg: float,
        target_center_norm: Optional[Tuple[float, float]] = None
    ) -> Dict[str, float]:
        """
        Calculates viewport transformation parameters:
        - rotation_correction_deg: Angle to counter-rotate canvas
        - offset_x_norm, offset_y_norm: Shift to center the target or level the horizon
        - zoom_scale: Current magnification factor
        """
        if self.gimbal_mode == "HORIZON_LOCKED":
            # Counter-rotate against drone roll to maintain level artificial horizon
            rotation_deg = drone_roll_deg
            offset_x = 0.0
            offset_y = 0.0

        elif self.gimbal_mode == "TARGET_CENTRIC" and target_center_norm is not None:
            # Counter-rotate roll and translate viewport so target stays dead center
            rotation_deg = drone_roll_deg
            # Shift canvas so target is at (0.5, 0.5)
            offset_x = target_center_norm[0] - 0.5
            offset_y = target_center_norm[1] - 0.5

        else:
            # FPV RAW: Direct pilot camera feed locked to drone frame
            rotation_deg = 0.0
            offset_x = 0.0
            offset_y = 0.0

        return {
            'rotation_correction_deg': rotation_deg,
            'offset_x_norm': offset_x,
            'offset_y_norm': offset_y,
            'zoom_factor': self.current_zoom
        }

    def set_manual_zoom(self, zoom: float):
        self.current_zoom = max(1.0, min(self.max_zoom, zoom))
        self.auto_zoom_enabled = False

    def set_gimbal_mode(self, mode: str):
        if mode in ("FPV_RAW", "HORIZON_LOCKED", "TARGET_CENTRIC"):
            self.gimbal_mode = mode
