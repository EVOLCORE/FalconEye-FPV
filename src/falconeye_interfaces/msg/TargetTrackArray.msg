# FalconEye FPV: Array of all active target tracks

std_msgs/Header header
falconeye_interfaces/TargetTrack[] tracks
uint64 active_designated_track_id   # 0 if no target is actively designated
