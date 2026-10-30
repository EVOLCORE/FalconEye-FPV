# FalconEye FPV: Single 2D/3D Detected Object

# Classification
string class_name        # e.g., "vehicle", "person", "boat", "drone"
uint32 class_id          # Numeric ID of detected class
float32 confidence       # Detection confidence (0.0 - 1.0)

# Normalized 2D Bounding Box in image frame [0.0 - 1.0]
float32 x_min
float32 y_min
float32 x_max
float32 y_max

# Pixel coordinates in original image resolution
int32 pixel_x_center
int32 pixel_y_center
int32 pixel_width
int32 pixel_height

# Optional 3D range/pose if depth sensor or PnP estimator is available
bool has_3d_pose
geometry_msgs/Point position_camera_frame  # Relative to camera lens (x=right, y=down, z=forward)
float32 estimated_range_meters             # Direct line-of-sight distance
