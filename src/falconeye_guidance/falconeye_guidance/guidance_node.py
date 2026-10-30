"""
FalconEye FPV - Guidance & Autonomy State Machine Node
Coordinates mission modes (STANDBY, TRACK_IBVS, LOST_TARGET_HOVER) and publishes flight velocity setpoints.
"""

import time
import rclpy
from rclpy.node import Node
from falconeye_interfaces.msg import (
    TargetTrack,
    TargetTrackArray,
    TargetDesignation,
    GuidanceCommand
)
from falconeye_guidance.visual_servoing import VisualServoingController

class FalconEyeGuidanceNode(Node):
    def __init__(self):
        super().__init__('falconeye_guidance_node')

        # Controllers & State
        self.servoing = VisualServoingController()
        self.designated_track_id = 0
        self.current_mode = GuidanceCommand.MODE_STANDBY
        self.last_seen_time = 0.0
        self.last_update_time = time.time()
        self.target_lost_timeout_sec = 3.0

        # Publishers
        self.cmd_pub = self.create_publisher(GuidanceCommand, '/falconeye/guidance/command', 10)

        # Subscribers
        self.create_subscription(TargetTrackArray, '/falconeye/perception/tracks', self.on_tracks_received, 10)
        self.create_subscription(TargetDesignation, '/falconeye/esp/designate_target', self.on_target_designated, 10)

        # Control loop timer (50 Hz)
        self.create_timer(1.0 / 50.0, self.control_loop)
        self.get_logger().info("FalconEye Guidance & State Machine initialized.")

    def on_target_designated(self, msg: TargetDesignation):
        if msg.command == TargetDesignation.CMD_LOCK_TRACK_ID:
            self.designated_track_id = msg.designated_track_id
            self.current_mode = GuidanceCommand.MODE_TRACK_IBVS
            self.servoing.reset()
            self.get_logger().info(f"Guidance Mode -> TRACK_IBVS on Target #{self.designated_track_id}")
        elif msg.command == TargetDesignation.CMD_BREAK_LOCK:
            self.designated_track_id = 0
            self.current_mode = GuidanceCommand.MODE_STANDBY
            self.servoing.reset()
            self.get_logger().info("Guidance Mode -> STANDBY (Manual / Hover)")

    def on_tracks_received(self, msg: TargetTrackArray):
        # Look for designated track
        now = time.time()
        if self.designated_track_id != 0:
            found = False
            for trk in msg.tracks:
                if trk.track_id == self.designated_track_id and trk.state in (TargetTrack.STATE_ACQUIRED, TargetTrack.STATE_TRACKING):
                    found = True
                    self.last_seen_time = now
                    dt = max(0.001, now - self.last_update_time)
                    self.last_update_time = now
                    
                    # Compute IBVS setpoints
                    vx, vy, vz, yaw_rate, ex, ey, ea = self.servoing.compute_setpoints(
                        (trk.x_min, trk.y_min, trk.x_max, trk.y_max),
                        dt
                    )
                    self.publish_command(
                        mode=GuidanceCommand.MODE_TRACK_IBVS,
                        in_sight=True,
                        vx=vx, vy=vy, vz=vz, yaw=yaw_rate,
                        ex=ex, ey=ey, ea=ea
                    )
                    break
            
            if not found and self.current_mode == GuidanceCommand.MODE_TRACK_IBVS:
                # Target not visible in current frame
                if now - self.last_seen_time < self.target_lost_timeout_sec:
                    # Coasting hover
                    self.publish_command(
                        mode=GuidanceCommand.MODE_LOST_TARGET_HOVER,
                        in_sight=False,
                        vx=0.0, vy=0.0, vz=0.0, yaw=0.0,
                        ex=0.0, ey=0.0, ea=0.0
                    )
                else:
                    self.get_logger().warn(f"Target #{self.designated_track_id} lost for >{self.target_lost_timeout_sec}s. Reverting to STANDBY.")
                    self.current_mode = GuidanceCommand.MODE_STANDBY
                    self.designated_track_id = 0

    def control_loop(self):
        """Fallback keep-alive publisher when in standby mode."""
        if self.current_mode == GuidanceCommand.MODE_STANDBY:
            self.publish_command(
                mode=GuidanceCommand.MODE_STANDBY,
                in_sight=False,
                vx=0.0, vy=0.0, vz=0.0, yaw=0.0,
                ex=0.0, ey=0.0, ea=0.0
            )

    def publish_command(self, mode: int, in_sight: bool, vx: float, vy: float, vz: float, yaw: float, ex: float, ey: float, ea: float):
        cmd = GuidanceCommand()
        cmd.header.stamp = self.get_clock().now().to_msg()
        cmd.header.frame_id = 'base_link'
        cmd.mode = mode
        cmd.tracked_target_id = self.designated_track_id
        cmd.target_in_sight = in_sight
        cmd.velocity_forward_mps = float(vx)
        cmd.velocity_lateral_mps = float(vy)
        cmd.velocity_vertical_mps = float(vz)
        cmd.yaw_rate_rad_s = float(yaw)
        cmd.error_normalized_x = float(ex)
        cmd.error_normalized_y = float(ey)
        cmd.error_area = float(ea)
        self.cmd_pub.publish(cmd)


def main(args=None):
    rclpy.init(args=args)
    node = FalconEyeGuidanceNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
