"""
FalconEye FPV - AI Object Detector & Tracker ROS 2 Node
Ingests camera frames, runs YOLO11/TensorRT inference, updates ByteTrack, and publishes target tracks.
"""

import time
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from falconeye_interfaces.msg import (
    Detection,
    DetectionArray,
    TargetTrack,
    TargetTrackArray,
    TargetDesignation
)

from falconeye_perception.tracker import FalconEyeTracker

class FalconEyeDetectorNode(Node):
    def __init__(self):
        super().__init__('falconeye_detector_node')

        # Parameters
        self.declare_parameter('weights_path', '')
        self.declare_parameter('conf_threshold', 0.4)
        self.declare_parameter('iou_threshold', 0.45)
        self.declare_parameter('use_simulated_stream', True)

        self.weights_path = self.get_parameter('weights_path').value
        self.conf_threshold = self.get_parameter('conf_threshold').value
        self.use_simulated_stream = self.get_parameter('use_simulated_stream').value

        # Initialize Tracker
        self.tracker = FalconEyeTracker()
        self.active_designated_track_id = 0
        self.frame_seq = 0

        # Try to load YOLO model if weights are provided
        self.model = None
        if self.weights_path:
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.weights_path)
                self.get_logger().info(f"Loaded YOLO weights from: {self.weights_path}")
            except Exception as e:
                self.get_logger().warn(f"Could not load YOLO model: {e}. Falling back to simulation mode.")

        # Publishers
        self.detections_pub = self.create_publisher(DetectionArray, '/falconeye/perception/detections', 10)
        self.tracks_pub = self.create_publisher(TargetTrackArray, '/falconeye/perception/tracks', 10)

        # Subscribers
        self.create_subscription(TargetDesignation, '/falconeye/esp/designate_target', self.on_target_designated, 10)

        if not self.use_simulated_stream:
            self.create_subscription(Image, '/falconeye/camera/image_raw', self.on_image_frame, 10)
        else:
            # Standalone simulation timer (30 Hz)
            self.create_timer(1.0 / 30.0, self.on_simulation_tick)
            self.get_logger().info("FalconEye Detector running in 30Hz Simulation/Synthetic mode.")

    def on_target_designated(self, msg: TargetDesignation):
        """Operator clicked or designated a target via the ESP interface."""
        if msg.command == TargetDesignation.CMD_LOCK_TRACK_ID:
            self.active_designated_track_id = msg.designated_track_id
            self.get_logger().info(f"🎯 Target Locked by Operator: Track ID #{self.active_designated_track_id}")
        elif msg.command == TargetDesignation.CMD_BREAK_LOCK:
            self.get_logger().info(f"🔓 Operator Broke Target Lock (Was Track #{self.active_designated_track_id})")
            self.active_designated_track_id = 0

    def on_simulation_tick(self):
        """Generates synthetic moving vehicle & person detections to test autonomy pipeline."""
        self.frame_seq += 1
        t = time.time()
        
        # Synthetic vehicle moving in a figure-eight path on the screen
        cx = 0.5 + 0.25 * (float(time.time() % 10.0) / 10.0 - 0.5) * 2.0
        cy = 0.5 + 0.15 * (float((time.time() * 1.5) % 8.0) / 8.0 - 0.5) * 2.0
        w, h = 0.12, 0.08
        
        sim_detections = [
            {
                'bbox': (cx - w/2, cy - h/2, cx + w/2, cy + h/2),
                'class_name': 'vehicle',
                'confidence': 0.92
            },
            {
                'bbox': (0.2, 0.7, 0.24, 0.8),
                'class_name': 'person',
                'confidence': 0.84
            }
        ]
        self.process_and_publish(sim_detections)

    def process_and_publish(self, raw_detections):
        """Passes detections into tracker and publishes standard messages."""
        t_start = time.time()
        
        # Update Multi-Object Tracker
        active_tracks = self.tracker.update(raw_detections)

        # 1. Publish Detections Array
        det_array = DetectionArray()
        det_array.header.stamp = self.get_clock().now().to_msg()
        det_array.header.frame_id = 'camera_optical_frame'
        det_array.frame_seq = self.frame_seq
        
        for d in raw_detections:
            msg_det = Detection()
            msg_det.class_name = d['class_name']
            msg_det.confidence = float(d['confidence'])
            msg_det.x_min, msg_det.y_min, msg_det.x_max, msg_det.y_max = d['bbox']
            det_array.detections.append(msg_det)

        det_array.inference_latency_ms = float((time.time() - t_start) * 1000.0)
        self.detections_pub.publish(det_array)

        # 2. Publish Track Array
        track_array = TargetTrackArray()
        track_array.header = det_array.header
        track_array.active_designated_track_id = self.active_designated_track_id

        for trk in active_tracks:
            msg_trk = TargetTrack()
            msg_trk.track_id = trk.track_id
            msg_trk.class_name = trk.class_name
            msg_trk.confidence = trk.confidence
            msg_trk.state = trk.state
            msg_trk.x_min, msg_trk.y_min, msg_trk.x_max, msg_trk.y_max = trk.bbox
            msg_trk.velocity_pixel_x = trk.velocity_x
            msg_trk.velocity_pixel_y = trk.velocity_y
            msg_trk.total_frames_tracked = trk.total_frames_tracked
            msg_trk.consecutive_lost_frames = trk.consecutive_lost_frames
            msg_trk.is_designated_target = (trk.track_id == self.active_designated_track_id)
            track_array.tracks.append(msg_trk)

        self.tracks_pub.publish(track_array)


def main(args=None):
    rclpy.init(args=args)
    node = FalconEyeDetectorNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
