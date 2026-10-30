# FalconEye FPV: Target fused across all airborne drones and shared with the swarm

uint64 global_target_id
string class_name           # "vehicle", "person", "boat", etc.
float32 confidence

# Estimated Real-World Location
float64 latitude
float64 longitude
float32 altitude_msl
float32 estimated_speed_mps
float32 heading_deg

# Swarm Attribution
uint32 spotting_drone_id    # Which drone first discovered it
uint32 tracking_drone_id    # Which drone is actively locked onto it (0 if unassigned)
bool is_locked
uint32 total_sightings_count
float64 last_seen_timestamp
