"""
FalconEye FPV - Multi-Object Tracker (MOT)
Maintains persistent track IDs, filters noisy bounding boxes, and estimates 2D velocity.
"""

import time
from typing import List, Dict, Optional, Tuple

class TrackedEntity:
    """Represents a single continuous tracked object."""
    def __init__(self, track_id: int, bbox: Tuple[float, float, float, float], class_name: str, confidence: float):
        self.track_id = track_id
        self.bbox = bbox  # (x_min, y_min, x_max, y_max) normalized [0, 1]
        self.class_name = class_name
        self.confidence = confidence
        
        # State: 0=Acquired, 1=Tracking, 2=Coasting (occluded), 3=Lost
        self.state = 0
        self.total_frames_tracked = 1
        self.consecutive_lost_frames = 0
        self.last_update_timestamp = time.time()
        
        # Velocity estimation (normalized coords / sec)
        self.velocity_x = 0.0
        self.velocity_y = 0.0
        self.center_x, self.center_y = self._get_center(bbox)

    @staticmethod
    def _get_center(bbox: Tuple[float, float, float, float]) -> Tuple[float, float]:
        return (bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0

    def update(self, new_bbox: Tuple[float, float, float, float], confidence: float, dt: float):
        """Update track with new matched detection."""
        new_cx, new_cy = self._get_center(new_bbox)
        
        if dt > 0.001:
            # Exponential moving average filter for velocity smoothing
            alpha = 0.4
            inst_vx = (new_cx - self.center_x) / dt
            inst_vy = (new_cy - self.center_y) / dt
            self.velocity_x = alpha * inst_vx + (1.0 - alpha) * self.velocity_x
            self.velocity_y = alpha * inst_vy + (1.0 - alpha) * self.velocity_y

        self.bbox = new_bbox
        self.center_x = new_cx
        self.center_y = new_cy
        self.confidence = confidence
        self.total_frames_tracked += 1
        self.consecutive_lost_frames = 0
        self.last_update_timestamp = time.time()
        
        if self.total_frames_tracked >= 3:
            self.state = 1  # Confirmed Tracking

    def mark_missed(self):
        """Called when no detection matches this track in the current frame."""
        self.consecutive_lost_frames += 1
        if self.consecutive_lost_frames > 2:
            self.state = 2  # Coasting / Occluded
        if self.consecutive_lost_frames > 15:
            self.state = 3  # Lost


class FalconEyeTracker:
    """Multi-object tracker with IoU association and velocity estimation."""
    def __init__(self, iou_threshold: float = 0.3, max_lost_frames: int = 20):
        self.iou_threshold = iou_threshold
        self.max_lost_frames = max_lost_frames
        self.tracks: Dict[int, TrackedEntity] = {}
        self._next_track_id = 1
        self._last_frame_time = time.time()

    @staticmethod
    def compute_iou(boxA: Tuple[float, float, float, float], boxB: Tuple[float, float, float, float]) -> float:
        """Compute Intersection-over-Union between two bounding boxes."""
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        inter_width = max(0.0, xB - xA)
        inter_height = max(0.0, yB - yA)
        inter_area = inter_width * inter_height

        areaA = max(0.0, boxA[2] - boxA[0]) * max(0.0, boxA[3] - boxA[1])
        areaB = max(0.0, boxB[2] - boxB[0]) * max(0.0, boxB[3] - boxB[1])
        union_area = areaA + areaB - inter_area

        if union_area <= 1e-6:
            return 0.0
        return inter_area / union_area

    def update(self, detections: List[Dict]) -> List[TrackedEntity]:
        """
        Update tracks with incoming detections from perception model.
        detections format: list of dicts with keys ['bbox', 'class_name', 'confidence']
        """
        current_time = time.time()
        dt = current_time - self._last_frame_time
        self._last_frame_time = current_time

        # Match existing tracks with detections via greedy IoU assignment
        unmatched_detections = list(range(len(detections)))
        unmatched_tracks = list(self.tracks.keys())

        matched_pairs = []
        if self.tracks and detections:
            # Build IoU cost matrix
            for track_id, track in self.tracks.items():
                best_iou = self.iou_threshold
                best_det_idx = -1
                for det_idx in unmatched_detections:
                    det = detections[det_idx]
                    # Only match if same class
                    if det['class_name'] == track.class_name:
                        iou = self.compute_iou(track.bbox, det['bbox'])
                        if iou > best_iou:
                            best_iou = iou
                            best_det_idx = det_idx

                if best_det_idx != -1:
                    matched_pairs.append((track_id, best_det_idx))
                    if best_det_idx in unmatched_detections:
                        unmatched_detections.remove(best_det_idx)
                    if track_id in unmatched_tracks:
                        unmatched_tracks.remove(track_id)

        # Update matched tracks
        for track_id, det_idx in matched_pairs:
            det = detections[det_idx]
            self.tracks[track_id].update(det['bbox'], det['confidence'], dt)

        # Mark unmatched tracks as missed
        for track_id in unmatched_tracks:
            self.tracks[track_id].mark_missed()

        # Create new tracks for unmatched detections
        for det_idx in unmatched_detections:
            det = detections[det_idx]
            new_track = TrackedEntity(
                track_id=self._next_track_id,
                bbox=det['bbox'],
                class_name=det['class_name'],
                confidence=det['confidence']
            )
            self.tracks[self._next_track_id] = new_track
            self._next_track_id += 1

        # Purge dead/lost tracks
        dead_tracks = [t_id for t_id, t in self.tracks.items() if t.consecutive_lost_frames > self.max_lost_frames]
        for t_id in dead_tracks:
            del self.tracks[t_id]

        return list(self.tracks.values())
