# FalconEye FPV: FalconNet Multi-Provider Network Telemetry

std_msgs/Header header

# Active primary data transport
uint8 TRANSPORT_WIFI6 = 0
uint8 TRANSPORT_MESH = 1
uint8 TRANSPORT_CELLULAR = 2
uint8 TRANSPORT_STARLINK = 3
uint8 active_transport

# Individual link connectivity
bool wifi6_connected
float32 wifi6_rssi_dbm
float32 wifi6_latency_ms

bool mesh_connected
uint32 mesh_hop_count
float32 mesh_link_quality_pct
float32 mesh_latency_ms

bool cellular_connected
string cellular_network_type     # e.g., "5G-SA", "4G-LTE"
float32 cellular_rssi_dbm
float32 cellular_latency_ms

bool starlink_connected
float32 starlink_throughput_mbps
float32 starlink_latency_ms

# Overall bonded metrics
float32 total_downlink_kbps
float32 total_uplink_kbps
float32 packet_loss_pct
bool failover_active
