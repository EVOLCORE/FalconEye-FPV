# FalconEye FPV: Autonomous Flight Guidance Command sent to Flight Controller

std_msgs/Header header

# Autonomy Flight Modes
uint8 MODE_STANDBY = 0           # Manual pilot control
uint8 MODE_SEARCH = 1            # Autonomous search pattern (sweep / spiral)
uint8 MODE_TRACK_IBVS = 2        # Image-Based Visual Servoing target tracking
uint8 MODE_ORBIT = 3             # Orbiting locked target at constant radius
uint8 MODE_INTERCEPT = 4         # Fast direct line intercept
uint8 MODE_LOST_TARGET_HOVER = 5 # Safety hover awaiting target recovery
uint8 mode

# Target details
uint64 tracked_target_id
bool target_in_sight

# Body-Frame / NED Velocity Setpoints (meters / second)
float32 velocity_forward_mps     # Forward (+) / Backward (-)
float32 velocity_lateral_mps     # Right (+) / Left (-)
float32 velocity_vertical_mps    # Down (+) / Up (-)

# Desired Yaw Rate (radians / second)
float32 yaw_rate_rad_s           # Clockwise (+) / Counter-Clockwise (-)

# Tracking errors (for PID tuning telemetry)
float32 error_normalized_x       # Horizontal error from frame center [-0.5, 0.5]
float32 error_normalized_y       # Vertical error from frame center [-0.5, 0.5]
float32 error_area               # Scale / range error
