"""
FalconEye FPV - Interactive Geofence & Killbox Boundary Enforcement
Evaluates coordinates against authorized Engagement Killboxes and restricted Keep-Out Zones.
"""

from typing import List, Tuple, Dict, Optional

class GeofenceZone:
    def __init__(self, zone_id: str, zone_type: str, polygon_coords: List[Tuple[float, float]]):
        self.zone_id = zone_id
        self.zone_type = zone_type  # 'KILLBOX' (Authorized engagement) or 'KEEP_OUT' (No-fly)
        self.polygon = polygon_coords  # List of (latitude, longitude)

class GeofenceManager:
    """Manages tactical boundary enforcement and target authorization."""
    def __init__(self):
        self.zones: Dict[str, GeofenceZone] = {}

    def add_zone(self, zone_id: str, zone_type: str, polygon_coords: List[Tuple[float, float]]):
        self.zones[zone_id] = GeofenceZone(zone_id, zone_type.upper(), polygon_coords)

    def remove_zone(self, zone_id: str):
        if zone_id in self.zones:
            del self.zones[zone_id]

    def clear_all(self):
        self.zones.clear()

    @staticmethod
    def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
        """
        Ray-casting algorithm to determine if a point (lat, lon) is inside a closed polygon.
        Returns True if point is strictly inside the polygon boundaries.
        """
        x, y = point
        inside = False
        n = len(polygon)
        if n < 3:
            return False

        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    def is_target_authorized_in_killbox(self, target_coords: Tuple[float, float]) -> bool:
        """
        Safety check: If any Killbox zones are defined, the target MUST fall inside at least one Killbox
        for autonomous intercept / collision flight to be permitted.
        If NO killboxes are defined, free engagement is permitted.
        """
        killboxes = [z.polygon for z in self.zones.values() if z.zone_type == 'KILLBOX']
        if not killboxes:
            return True  # No restrictions active
        return any(self.point_in_polygon(target_coords, box) for box in killboxes)

    def is_drone_in_keep_out_zone(self, drone_coords: Tuple[float, float]) -> bool:
        """Safety check: Returns True if the drone violates any active Keep-Out Zone."""
        keep_out_zones = [z.polygon for z in self.zones.values() if z.zone_type == 'KEEP_OUT']
        return any(self.point_in_polygon(drone_coords, zone) for zone in keep_out_zones)
