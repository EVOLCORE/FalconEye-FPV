"""
FalconEye FPV - Image-Based Visual Servoing (IBVS) Controller
Calculates velocity and yaw rate setpoints from image-space bounding box errors.
"""

from typing import Tuple

class PIDController:
    """Standard PID controller with anti-windup clamp."""
    def __init__(self, kp: float, ki: float, kd: float, output_min: float, output_max: float):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.output_min = output_min
        self.output_max = output_max
        
        self.integral = 0.0
        self.prev_error = 0.0
        self.initialized = False

    def update(self, error: float, dt: float) -> float:
        if dt <= 0.0001:
            return 0.0

        # Proportional term
        p_term = self.kp * error

        # Integral term with anti-windup clamping
        self.integral += error * dt
        # Clamp integral to prevent windup
        integral_limit = (self.output_max - self.output_min) / (self.ki if self.ki > 0 else 1.0)
        self.integral = max(-integral_limit, min(integral_limit, self.integral))
        i_term = self.ki * self.integral

        # Derivative term
        if not self.initialized:
            d_term = 0.0
            self.initialized = True
        else:
            d_term = self.kd * (error - self.prev_error) / dt
        self.prev_error = error

        output = p_term + i_term + d_term
        return max(self.output_min, min(self.output_max, output))

    def reset(self):
        self.integral = 0.0
        self.prev_error = 0.0
        self.initialized = False


class VisualServoingController:
    """Translates normalized target bounding box into drone body-frame motion setpoints."""
    def __init__(
        self,
        target_area: float = 0.04,     # Desired target bounding box area (e.g. 20% x 20% of screen)
        max_forward_speed: float = 8.0, # m/s
        max_vertical_speed: float = 3.0,# m/s
        max_yaw_rate: float = 1.57      # rad/s (~90 deg/s)
    ):
        self.target_area = target_area
        
        # PIDs for 3 axes:
        # 1. Yaw Rate: Driven by horizontal pixel offset (error_x)
        self.pid_yaw = PIDController(kp=2.2, ki=0.05, kd=0.15, output_min=-max_yaw_rate, output_max=max_yaw_rate)
        # 2. Vertical Speed (vz): Driven by vertical pixel offset (error_y)
        self.pid_z = PIDController(kp=2.5, ki=0.05, kd=0.12, output_min=-max_vertical_speed, output_max=max_vertical_speed)
        # 3. Forward Speed (vx): Driven by scale/area offset (error_area)
        self.pid_x = PIDController(kp=15.0, ki=0.1, kd=0.5, output_min=-2.0, output_max=max_forward_speed)

    def compute_setpoints(
        self,
        bbox: Tuple[float, float, float, float],
        dt: float
    ) -> Tuple[float, float, float, float, float, float, float]:
        """
        Calculates (vx, vy, vz, yaw_rate, error_x, error_y, error_area).
        bbox: normalized coordinates (x_min, y_min, x_max, y_max) in [0.0, 1.0].
        """
        center_x = (bbox[0] + bbox[2]) / 2.0
        center_y = (bbox[1] + bbox[3]) / 2.0
        width = max(0.01, bbox[2] - bbox[0])
        height = max(0.01, bbox[3] - bbox[1])
        current_area = width * height

        # Errors:
        # error_x: positive when target is right of center -> turn right (positive yaw)
        error_x = center_x - 0.5
        # error_y: positive when target is below center -> descend (positive vz in NED, or negative z in body)
        error_y = center_y - 0.5
        # error_area: positive when target is smaller than desired -> fly forward (positive vx)
        error_area = self.target_area - current_area

        # Compute outputs
        yaw_rate = self.pid_yaw.update(error_x, dt)
        vz = self.pid_z.update(error_y, dt)
        vx = self.pid_x.update(error_area, dt)
        vy = 0.0 # Standard FPV quad steers primarily with coordinated yaw + forward bank

        return vx, vy, vz, yaw_rate, error_x, error_y, error_area

    def reset(self):
        self.pid_yaw.reset()
        self.pid_z.reset()
        self.pid_x.reset()
