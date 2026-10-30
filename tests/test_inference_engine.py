"""
Unit tests for FalconEye Modular Inference Engine and Backend Factory.
"""

import unittest
import sys
import os

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'falconeye_perception')))

from falconeye_perception.inference_engine import (
    BaseInferenceEngine,
    MockInferenceEngine,
    create_inference_engine
)

class TestInferenceEngine(unittest.TestCase):
    def test_mock_inference_engine(self):
        engine = MockInferenceEngine(model_path="test_mock.engine")
        engine.warmup()
        
        detections = engine.infer()
        self.assertIsInstance(detections, list)
        self.assertGreater(len(detections), 0)
        
        # Verify detection schema
        first_det = detections[0]
        self.assertIn('bbox', first_det)
        self.assertIn('class_name', first_det)
        self.assertIn('confidence', first_det)
        
        # Verify normalized coordinates
        x1, y1, x2, y2 = first_det['bbox']
        self.assertTrue(0.0 <= x1 < x2 <= 1.0)
        self.assertTrue(0.0 <= y1 < y2 <= 1.0)
        self.assertTrue(0.0 <= first_det['confidence'] <= 1.0)

    def test_factory_creation(self):
        # Valid mock engine
        mock_eng = create_inference_engine('mock', 'model.onnx')
        self.assertIsInstance(mock_eng, MockInferenceEngine)

        # Invalid backend should raise ValueError
        with self.assertRaises(ValueError):
            create_inference_engine('unsupported_backend', 'model.pt')

if __name__ == '__main__':
    unittest.main()
