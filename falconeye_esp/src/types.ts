export interface BoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface TargetTrack {
  trackId: number;
  className: string;
  confidence: number;
  state: 'ACQUIRED' | 'TRACKING' | 'COASTING' | 'LOST';
  bbox: BoundingBox;
  velocityX: number;
  velocityY: number;
  distanceMeters?: number;
  isDesignated?: boolean;
  trackingDroneId?: number;
}

export interface FlightStatus {
  armed: boolean;
  flightMode: 'MANUAL' | 'ALT_HOLD' | 'POS_HOLD' | 'OFFBOARD' | 'RTL';
  batteryPct: number;
  batteryVoltage: number;
  altitudeMeters: number;
  speedMps: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  gpsStatus: 'NO_GPS' | '3D_FIX' | 'RTK_LOCK';
  satellites: number;
}

export interface SwarmDroneInfo {
  droneId: number;
  callsign: string;
  batteryPct: number;
  altitudeMeters: number;
  headingDeg: number;
  linkQualityPct: number;
  relayThroughDroneId: number; // 0 if direct to pilot
  role: 'SCOUT' | 'TRACKING' | 'RELAY' | 'RTH';
  lockedTargetId: number | null;
}

export interface NetworkProviderStatus {
  connected: boolean;
  rssi?: number;
  latencyMs: number;
  details?: string;
}

export interface FalconNetStatus {
  activeTransport: 'WIFI6' | 'MESH' | 'CELLULAR' | 'STARLINK';
  wifi6: NetworkProviderStatus;
  mesh: NetworkProviderStatus;
  cellular: NetworkProviderStatus;
  starlink: NetworkProviderStatus;
  packetLossPct: number;
  activeAirborneRelaysCount: number;
}
