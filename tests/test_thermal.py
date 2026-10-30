"""
Unit tests for FalconEye Thermal Radiance Processing Engine.
Uses Python standard library unittest.
"""

import unittest
import sys
import os
import numpy as np

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'falconeye_perception')))

from falconeye_perception.thermal_engine import ThermalProcessor

class TestThermalEngine(unittest.TestCase):
    def setUp(self):
        self.thermal = ThermalProcessor(default_palette='WHITE_HOT')

    def test_white_hot_military_default(self):
        # Create a synthetic image with a cold background (value 30) and a hot engine spot (value 240)
        img = np.full((100, 100, 3), 30, dtype=np.uint8)
        img[45:55, 45:55] = 240  # Hot vehicle engine

        processed = self.thermal.process_frame(img, palette='WHITE_HOT')
        self.assertEqual(processed.shape, (100, 100, 3))
        # Hot spot must remain bright (near 255)
        self.assertGreater(processed[50, 50, 0], 200)
        # Background must remain dark
        self.assertLess(processed[10, 10, 0], 60)

    def test_black_hot_inverted(self):
        img = np.full((100, 100, 3), 30, dtype=np.uint8)
        img[45:55, 45:55] = 240

        processed = self.thermal.process_frame(img, palette='BLACK_HOT')
        # In Black-Hot, hot spot must be pitch dark (near 0)
        self.assertLess(processed[50, 50, 0], 55)
        # Background must be light
        self.assertGreater(processed[10, 10, 0], 200)

    def test_ironbow_palette(self):
        img = np.linspace(0, 255, 100, dtype=np.uint8).reshape(10, 10)
        processed = self.thermal.process_frame(img, palette='IRONBOW')
        self.assertEqual(processed.shape, (10, 10, 3))

    def test_hotspot_extraction(self):
        rad = np.full((100, 100), 50, dtype=np.uint8)
        rad[40:60, 40:60] = 230  # Cluster of hot pixels
        hotspots = self.thermal.extract_hotspots(rad, hot_threshold=200)
        self.assertEqual(len(hotspots), 1)
        x1, y1, x2, y2 = hotspots[0]
        self.assertEqual(x1, 40)
        self.assertEqual(y1, 40)
        self.assertEqual(x2, 59)
        self.assertEqual(y2, 59)

if __name__ == '__main__':
    unittest.main()
