"""
FalconEye FPV - FalconNet Multi-Provider Resilient Network Daemon
Monitors Wi-Fi 6, Ad-Hoc Mesh, Cellular 4G/5G, and Satellite Starlink links.
Implements automated path selection, seamless failover, and 3-tier Quality-of-Service (QoS).
"""

import time
from typing import Dict, Optional

class NetworkProvider:
    """Represents a physical or virtual communication transport."""
    def __init__(self, name: str, priority_rank: int, max_bandwidth_kbps: int):
        self.name = name
        self.priority_rank = priority_rank  # Lower number = higher preferred priority
        self.max_bandwidth_kbps = max_bandwidth_kbps
        self.connected = False
        self.latency_ms = 999.0
        self.packet_loss_pct = 0.0
        self.rssi_dbm = -100.0
        self.consecutive_failures = 0
        self.last_probe_time = 0.0

    def update_metrics(self, connected: bool, latency_ms: float, rssi_dbm: float = -60.0):
        self.connected = connected
        self.latency_ms = latency_ms
        self.rssi_dbm = rssi_dbm
        self.last_probe_time = time.time()
        
        if not connected:
            self.consecutive_failures += 1
        else:
            self.consecutive_failures = 0

    @property
    def is_healthy(self) -> bool:
        return self.connected and self.consecutive_failures < 3 and self.latency_ms < 250.0


class FalconNetLinkManager:
    """Manages multi-provider failover and QoS traffic dispatching."""
    def __init__(self):
        self.providers: Dict[str, NetworkProvider] = {
            'WIFI6': NetworkProvider('WIFI6', priority_rank=1, max_bandwidth_kbps=54000),
            'MESH': NetworkProvider('MESH', priority_rank=2, max_bandwidth_kbps=15000),
            'CELLULAR': NetworkProvider('CELLULAR', priority_rank=3, max_bandwidth_kbps=25000),
            'STARLINK': NetworkProvider('STARLINK', priority_rank=4, max_bandwidth_kbps=40000),
        }
        self.active_transport = 'WIFI6'
        self.failover_count = 0
        self.last_switch_time = time.time()
        self.hysteresis_cooldown_sec = 2.0  # Prevent flapping between links

    def evaluate_best_link(self) -> str:
        """Selects the best available link based on priority rank, health, and latency."""
        now = time.time()
        # Sort by preferred priority rank
        sorted_providers = sorted(self.providers.values(), key=lambda p: (not p.is_healthy, p.priority_rank, p.latency_ms))
        
        best = sorted_providers[0]
        if not best.is_healthy:
            # Fallback to any connected link even with higher latency
            connected = [p for p in sorted_providers if p.connected]
            if connected:
                best = connected[0]
            else:
                return self.active_transport # Maintain current link if all probing fails

        if best.name != self.active_transport:
            if now - self.last_switch_time > self.hysteresis_cooldown_sec:
                # Execute seamless failover
                self.active_transport = best.name
                self.failover_count += 1
                self.last_switch_time = now

        return self.active_transport

    def dispatch_packet(self, priority_level: int, payload_bytes: bytes) -> Dict[str, str]:
        """
        QoS Traffic Dispatcher:
        - Priority 0 (Critical): Multi-cast duplicated over ALL healthy links simultaneously.
        - Priority 1 (ESP Telemetry): Dispatched over the lowest-latency active link.
        - Priority 2 (Video Feed): Dispatched over highest-bandwidth active link with bitrate throttling signal.
        """
        healthy_links = [name for name, p in self.providers.items() if p.is_healthy]
        if not healthy_links:
            healthy_links = [self.active_transport]

        if priority_level == 0:
            # Duplicated over all links for zero-packet-loss reliability
            return {
                'action': 'DUPLICATE_ALL',
                'dest_links': healthy_links,
                'qos': 'HIGH_REDUNDANCY'
            }
        elif priority_level == 1:
            # Lowest latency link
            lowest_lat = min(healthy_links, key=lambda name: self.providers[name].latency_ms)
            return {
                'action': 'ROUTED_SINGLE',
                'dest_link': lowest_lat,
                'qos': 'ACK_REQUIRED'
            }
        else: # Priority 2 - Video Stream
            highest_bw = max(healthy_links, key=lambda name: self.providers[name].max_bandwidth_kbps)
            return {
                'action': 'ROUTED_STREAM',
                'dest_link': highest_bw,
                'target_bitrate_kbps': min(self.providers[highest_bw].max_bandwidth_kbps, 6000),
                'qos': 'ADAPTIVE_BITRATE'
            }
