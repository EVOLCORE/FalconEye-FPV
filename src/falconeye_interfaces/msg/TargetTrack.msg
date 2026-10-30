# FalconEye FPV: Persistent Target Track with Motion & Geolocation

# Unique persistent tracker ID
uint64 track_id

# Target classification
string class_name
float32 confidence

# Tracking State
uint8 STATE_ACQUIRED = 0
uint8 STATE_TRACKING = 1
uint8 STATE_COASTING = 2    # Temporarily occluded, predicting via Kalman Filter
uint8 STATE_LOST = 3
uint8 state

# Normalized Bounding Box [0.0 - 1.0]
float32 x_min
float32 y_min
float32 x_max
float32 y_max

# 2D Screen pixel motion velocity vector (pixels per second)
float32 velocity_pixel_x
float32 velocity_pixel_y

# Real-world Geolocation (Estimated from drone pose & camera ray projection)
bool has_geolocation
float64 latitude
float64 longitude
float32 altitude_msl
float32 estimated_ground_speed_mps

# Track Age & Statistics
uint32 total_frames_tracked
uint32 consecutive_lost_frames
float32 distance_to_drone_meters
bool is_designated_target   # True if this is the active locked target for visual servoing
