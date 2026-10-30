cmake_minimum_required(VERSION 3.8)
project(falconeye_interfaces)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(std_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/Detection.msg"
  "msg/DetectionArray.msg"
  "msg/TargetTrack.msg"
  "msg/TargetTrackArray.msg"
  "msg/TargetDesignation.msg"
  "msg/GuidanceCommand.msg"
  "msg/NetworkStatus.msg"
  DEPENDENCIES std_msgs geometry_msgs
)

ament_package()
