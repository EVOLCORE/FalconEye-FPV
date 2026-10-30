# FalconEye FPV: Operator Target Designation Command (Click-to-Track)

std_msgs/Header header

# Command Type
uint8 CMD_LOCK_TRACK_ID = 0      # Lock by specific track_id
uint8 CMD_LOCK_PIXEL_COORD = 1   # Lock closest target to clicked normalized (x, y)
uint8 CMD_BREAK_LOCK = 2         # Disengage active tracking and return to hover/manual
uint8 CMD_CYCLE_TARGET = 3       # Cycle to next available target
uint8 command

# Target specification
uint64 designated_track_id       # Used if command == CMD_LOCK_TRACK_ID
float32 click_normalized_x       # Used if command == CMD_LOCK_PIXEL_COORD (0.0 - 1.0)
float32 click_normalized_y       # Used if command == CMD_LOCK_PIXEL_COORD (0.0 - 1.0)

# Operator identity & intent
string operator_id
string notes
