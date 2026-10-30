# FalconEye FPV: Request to hand off an actively tracked target between drones

std_msgs/Header header

uint64 global_target_id     # Which target to transfer
uint32 from_drone_id        # Current tracking drone (e.g., 1)
uint32 to_drone_id          # Designated receiver drone (e.g., 2)
string reason               # "LOW_BATTERY", "PILOT_REQUEST", "OBSTACLE_AVOIDANCE"
bool handoff_accepted       # Confirmation response from receiving drone
