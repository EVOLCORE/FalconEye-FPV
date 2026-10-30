"""
Unit tests for VisDrone to YOLO format annotation converter.
"""

import unittest
import sys
import os

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_models', 'datasets')))

from visdrone_converter import convert_visdrone_line

class TestVisDroneConverter(unittest.TestCase):
    def test_convert_car_annotation(self):
        # VisDrone line: <bbox_left>,<bbox_top>,<bbox_width>,<bbox_height>,<score>,<category=4(car)>,<trunc>,<occlusion>
        raw_line = "100,200,80,60,1,4,0,0"
        img_w, img_h = 1000, 1000

        # Car (category 4) maps to class_id 3 in YOLO
        # center_x = (100 + 40) / 1000 = 0.14
        # center_y = (200 + 30) / 1000 = 0.23
        # width = 80 / 1000 = 0.08
        # height = 60 / 1000 = 0.06
        converted = convert_visdrone_line(raw_line, img_w, img_h)
        self.assertIsNotNone(converted)
        
        parts = converted.split()
        self.assertEqual(parts[0], '3') # class_id for car
        self.assertAlmostEqual(float(parts[1]), 0.14, places=4)
        self.assertAlmostEqual(float(parts[2]), 0.23, places=4)
        self.assertAlmostEqual(float(parts[3]), 0.08, places=4)
        self.assertAlmostEqual(float(parts[4]), 0.06, places=4)

    def test_ignore_category_zero(self):
        # Category 0 = ignored regions
        raw_line = "50,50,10,10,1,0,0,0"
        converted = convert_visdrone_line(raw_line, 1000, 1000)
        self.assertEqual(converted, "")

    def test_ignore_zero_score(self):
        # Score 0 = invalid annotation
        raw_line = "50,50,10,10,0,4,0,0"
        converted = convert_visdrone_line(raw_line, 1000, 1000)
        self.assertEqual(converted, "")

if __name__ == '__main__':
    unittest.main()
