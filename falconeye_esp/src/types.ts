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
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  isDesignated?: boolean;
}

export interface Telemetry {
  armed: boolean;
  flightMode: 'MANUAL' | 'ALT_HOLD' | 'POS_HOLD' | 'OFFBOARD' | 'RTL';
  batteryPct: number;
  batteryVoltage: number;
  altitudeMeters: number;
  groundSpeedMps: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  gpsFix: 'NONE' | '2D' | '3D' | 'RTK_FIXED';
  satellites: number;
}

export interface NetworkProviderStatus {
  connected: boolean;
  rssi?: number;
  latencyMs: number;
  throughputKbps?: number;
  details?: string;
}

export interface FalconNetStatus {
  activeTransport: 'WIFI6' | 'MESH' | 'CELLULAR' | 'STARLINK';
  wifi6: NetworkProviderStatus;
  mesh: NetworkProviderStatus;
  cellular: NetworkProviderStatus;
  starlink: NetworkProviderStatus;
  packetLossPct: number;
}
