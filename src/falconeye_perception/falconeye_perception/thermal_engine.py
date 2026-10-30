"""
FalconEye FPV - Thermal & Infrared Radiance Processing Engine
Generates White-Hot (Military Standard), Black-Hot, and Ironbow infrared heatmaps.
Highlights hot engine/exhaust vehicle signatures and human body thermal radiance.
"""

from typing import List, Dict, Tuple, Optional
import numpy as np

class ThermalProcessor:
    """Simulates and processes infrared thermal radiance maps."""
    def __init__(self, default_palette: str = 'WHITE_HOT'):
        self.current_palette = default_palette  # 'WHITE_HOT', 'BLACK_HOT', 'IRONBOW'
        self._ironbow_lut = self._build_ironbow_lut()

    @staticmethod
    def _build_ironbow_lut() -> np.ndarray:
        """Precomputes 256-color Ironbow thermal color lookup table."""
        lut = np.zeros((256, 3), dtype=np.uint8)
        for i in range(256):
            t = i / 255.0
            # Ironbow curve: Cold (Black/Dark Purple) -> Medium (Red/Orange) -> Hottest (Yellow/White)
            lut[i, 0] = int(255 * (t ** 2.2))                   # Blue
            lut[i, 1] = int(255 * (t ** 1.2) * np.sin(np.pi * t)) # Green
            lut[i, 2] = int(255 * min(1.0, 2.0 * t))            # Red
        return lut

    def process_frame(self, frame: np.ndarray, palette: Optional[str] = None) -> np.ndarray:
        """
        Converts input RGB/BGR or grayscale frame into infrared thermal visualization.
        frame shape: (H, W, 3) or (H, W).
        """
        active_palette = palette or self.current_palette

        if frame.ndim == 3:
            # Convert to luminance / thermal radiance intensity (0-255)
            # Weights: green/red carry significant infrared reflectance
            radiance = (0.299 * frame[:, :, 2] + 0.587 * frame[:, :, 1] + 0.114 * frame[:, :, 0]).astype(np.uint8)
        else:
            radiance = frame.copy()

        # Enhance thermal contrast (histogram stretch for hot targets)
        p_min, p_max = np.percentile(radiance, (2, 98))
        if p_max > p_min:
            stretched = np.clip((radiance - p_min) * (255.0 / (p_max - p_min)), 0, 255).astype(np.uint8)
        else:
            stretched = radiance

        if active_palette == 'WHITE_HOT':
            # Classic Military: Hot objects glow bright white, cold background is dark
            return np.repeat(stretched[:, :, np.newaxis], 3, axis=2)

        elif active_palette == 'BLACK_HOT':
            # Inverted Military: Hot objects appear pitch black against light background
            inverted = 255 - stretched
            return np.repeat(inverted[:, :, np.newaxis], 3, axis=2)

        elif active_palette == 'IRONBOW':
            # Multi-color infrared heatmap gradient
            return self._ironbow_lut[stretched]

        # Daylight fallback
        return frame

    def extract_hotspots(self, radiance_frame: np.ndarray, hot_threshold: int = 210) -> List[Tuple[int, int, int, int]]:
        """Identifies concentrated hot thermal spots (e.g. running vehicle engines/exhausts)."""
        hot_mask = radiance_frame > hot_threshold
        # Simple bounding box cluster detection
        y_indices, x_indices = np.where(hot_mask)
        if len(x_indices) > 20:
            x_min, x_max = int(np.min(x_indices)), int(np.max(x_indices))
            y_min, y_max = int(np.min(y_indices)), int(np.max(y_indices))
            return [(x_min, y_min, x_max, y_max)]
        return []
