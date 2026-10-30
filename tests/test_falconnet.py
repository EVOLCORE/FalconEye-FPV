"""
Unit tests for FalconNet Multi-Provider Resilient Network Daemon & QoS Dispatcher.
"""

import unittest
import sys
import os

# Add package path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'falconeye_net')))

from link_manager import FalconNetLinkManager, NetworkProvider

class TestFalconNet(unittest.TestCase):
    def setUp(self):
        self.net = FalconNetLinkManager()

    def test_default_link_evaluation(self):
        # All links initially disconnected
        self.assertEqual(self.net.active_transport, 'WIFI6')

        # Connect Wi-Fi 6 with healthy metrics
        self.net.providers['WIFI6'].update_metrics(connected=True, latency_ms=12.0)
        best = self.net.evaluate_best_link()
        self.assertEqual(best, 'WIFI6')

    def test_failover_when_wifi_fails(self):
        # Setup Wi-Fi and Cellular
        self.net.providers['WIFI6'].update_metrics(connected=True, latency_ms=10.0)
        self.net.providers['CELLULAR'].update_metrics(connected=True, latency_ms=35.0)
        self.net.evaluate_best_link()
        self.assertEqual(self.net.active_transport, 'WIFI6')

        # Simulate Wi-Fi signal drop (fail 3 probes)
        for _ in range(3):
            self.net.providers['WIFI6'].update_metrics(connected=False, latency_ms=999.0)

        # Allow hysteresis cooldown
        self.net.last_switch_time = 0.0
        new_best = self.net.evaluate_best_link()
        
        # Must failover to Cellular!
        self.assertEqual(new_best, 'CELLULAR')
        self.assertEqual(self.net.failover_count, 1)

    def test_qos_packet_dispatcher(self):
        # Connect Wi-Fi and Mesh
        self.net.providers['WIFI6'].update_metrics(connected=True, latency_ms=15.0)
        self.net.providers['MESH'].update_metrics(connected=True, latency_ms=25.0)

        # Priority 0 (Critical safety / RC / Disarm) -> Must duplicate over all healthy links
        p0_dispatch = self.net.dispatch_packet(priority_level=0, payload_bytes=b"DISARM")
        self.assertEqual(p0_dispatch['action'], 'DUPLICATE_ALL')
        self.assertIn('WIFI6', p0_dispatch['dest_links'])
        self.assertIn('MESH', p0_dispatch['dest_links'])

        # Priority 1 (Telemetry) -> Must route to lowest latency link (WIFI6: 15ms < MESH: 25ms)
        p1_dispatch = self.net.dispatch_packet(priority_level=1, payload_bytes=b"TELEMETRY")
        self.assertEqual(p1_dispatch['action'], 'ROUTED_SINGLE')
        self.assertEqual(p1_dispatch['dest_link'], 'WIFI6')

        # Priority 2 (Video Stream) -> Must route to highest bandwidth link (WIFI6: 54Mbps > MESH: 15Mbps)
        p2_dispatch = self.net.dispatch_packet(priority_level=2, payload_bytes=b"H264_FRAME")
        self.assertEqual(p2_dispatch['action'], 'ROUTED_STREAM')
        self.assertEqual(p2_dispatch['dest_link'], 'WIFI6')

if __name__ == '__main__':
    unittest.main()
