# FalconEye FPV: State of an active drone in the airborne swarm

uint32 drone_id
string callsign             # e.g., "Falcon-1", "Falcon-2"
bool is_online
float32 battery_pct
float32 battery_voltage

# Position & Heading
float64 latitude
float64 longitude
float32 altitude_meters
float32 heading_deg
float32 speed_mps

# Network & Relay Status
bool has_direct_pilot_link
uint32 direct_link_quality_pct
uint32 relay_drone_id       # 0 if direct to pilot, or drone_id acting as airborne relay

# Active Task & Target
string role                 # "SCOUT", "RELAY", "TRACKING", "RTH"
uint64 locked_target_id     # 0 if free / searching
