"""
Unit tests for FalconEye Multi-Object Tracker (IoU, Track Creation, Association, and Coasting).
Uses Python standard library unittest.
"""

import unittest
import sys
import os

# Add package to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'falconeye_perception')))

from falconeye_perception.tracker import FalconEyeTracker, TrackedEntity

class TestFalconEyeTracker(unittest.TestCase):
    def test_iou_computation(self):
        # Exact overlapping boxes
        boxA = (0.1, 0.1, 0.3, 0.3)
        boxB = (0.1, 0.1, 0.3, 0.3)
        self.assertAlmostEqual(FalconEyeTracker.compute_iou(boxA, boxB), 1.0, places=3)

        # Completely disjoint boxes
        boxC = (0.5, 0.5, 0.7, 0.7)
        self.assertAlmostEqual(FalconEyeTracker.compute_iou(boxA, boxC), 0.0, places=4)

        # 50% horizontal overlap
        boxD = (0.2, 0.1, 0.4, 0.3)
        self.assertAlmostEqual(FalconEyeTracker.compute_iou(boxA, boxD), 1.0 / 3.0, places=2)

    def test_tracker_creation_and_association(self):
        tracker = FalconEyeTracker(iou_threshold=0.3)
        
        # Frame 1: Single vehicle detected
        det_f1 = [{'bbox': (0.4, 0.4, 0.6, 0.6), 'class_name': 'vehicle', 'confidence': 0.95}]
        tracks_f1 = tracker.update(det_f1)
        
        self.assertEqual(len(tracks_f1), 1)
        t1 = tracks_f1[0]
        self.assertEqual(t1.track_id, 1)
        self.assertEqual(t1.class_name, 'vehicle')
        self.assertEqual(t1.state, 0) # ACQUIRED
        
        # Frame 2: Vehicle slightly moved
        det_f2 = [{'bbox': (0.42, 0.41, 0.62, 0.61), 'class_name': 'vehicle', 'confidence': 0.93}]
        tracks_f2 = tracker.update(det_f2)
        
        self.assertEqual(len(tracks_f2), 1)
        self.assertEqual(tracks_f2[0].track_id, 1) # Identity preserved!
        self.assertEqual(tracks_f2[0].total_frames_tracked, 2)

    def test_tracker_coasting_and_recovery(self):
        tracker = FalconEyeTracker(iou_threshold=0.3, max_lost_frames=5)
        
        # Initial detections
        tracker.update([{'bbox': (0.4, 0.4, 0.6, 0.6), 'class_name': 'car', 'confidence': 0.9}])
        tracker.update([{'bbox': (0.4, 0.4, 0.6, 0.6), 'class_name': 'car', 'confidence': 0.9}])
        tracker.update([{'bbox': (0.4, 0.4, 0.6, 0.6), 'class_name': 'car', 'confidence': 0.9}])
        
        # Target goes behind a building (0 detections for 3 frames)
        for _ in range(3):
            tracker.update([])
            
        self.assertIn(1, tracker.tracks)
        self.assertEqual(tracker.tracks[1].state, 2) # COASTING
        self.assertEqual(tracker.tracks[1].consecutive_lost_frames, 3)
        
        # Target re-emerges
        tracker.update([{'bbox': (0.41, 0.41, 0.61, 0.61), 'class_name': 'car', 'confidence': 0.91}])
        self.assertEqual(tracker.tracks[1].state, 1) # Resumed TRACKING
        self.assertEqual(tracker.tracks[1].consecutive_lost_frames, 0)

if __name__ == '__main__':
    unittest.main()
