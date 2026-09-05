export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface RiskZone {
  id: string;
  name: string;
  state: 'Sikkim' | 'Meghalaya' | 'Arunachal Pradesh' | 'Assam' | 'Nagaland' | 'Manipur' | 'Mizoram';
  lat: number;
  lng: number;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  rainfall: number; // mm / 24h
  soilMoisture: number; // percentage 0 - 100
  slope: number; // degrees
  historicalRisk: 'Low' | 'Moderate' | 'High' | 'Extreme';
  status: 'STABLE' | 'WATCH' | 'WARNING' | 'ROAD AT RISK' | 'CRITICAL';
  recommendedAction: string;
  affectedRoad?: string;
  affectedVillage?: string;
  factors: string[];
  // Population Impact (Feature)
  estimatedPopulationAtRisk: number;
  nearbySettlements: string[];
  potentiallyIsolatedSettlements: string[];
  // Hospital & Healthcare Facility Data (Feature)
  nearbyHospitals: HospitalFacility[];
  // ISRO / NRSC Landslide Atlas (2023) Trained Parameters
  isroDistrictRank?: number;
  district?: string;
  varnesClassification?: string;
  threeDayCumulativeRainfall?: number;
  thirtyDayAntecedentRainfall?: number;
  isroEarlyWarningProbability?: number;
}

export interface HospitalFacility {
  id: string;
  name: string;
  type: 'Trauma & Tertiary Hospital' | 'District Hospital' | 'Community Health Centre (CHC)' | 'Primary Health Centre (PHC)';
  state: string;
  district: string;
  lat: number;
  lng: number;
  nearestRoad: string;
  distanceKm: number;
  etaMinutes: number;
  emergencyBeds: number;
  icuBeds: number;
  bloodBank: boolean;
  helipad: boolean;
  ambulanceAvailable: boolean;
  contactNumber: string;
  accessRouteStatus: 'Accessible' | 'Route Impaired (Caution)' | 'Cut Off / Alternate Route Needed';
  alternateRoute?: string;
}

export interface RoadItem {
  id: string;
  name: string;
  route: string;
  state: string;
  riskLevel: RiskLevel;
  lengthKm: number;
  status: 'OPEN' | 'CAUTION' | 'ROAD AT RISK' | 'BLOCKED';
  connectedZones: string[];
}

export interface VillageItem {
  id: string;
  name: string;
  state: string;
  district: string;
  population: number;
  riskLevel: RiskLevel;
  nearestRoad: string;
}

export interface AlertItem {
  id: string;
  level: RiskLevel;
  location: string;
  state: string;
  riskScore: number;
  summary: string;
  details: string;
  timeAgo: string;
  timestamp: string;
  acknowledged: boolean;
  roadAffected?: string;
}

export type HazardType = 'Landslide' | 'Crack' | 'Rockfall' | 'Flood' | 'Road Blockage';

export interface HazardReport {
  id: string;
  hazardType: HazardType;
  location: string;
  state: string;
  timeAgo: string;
  timestamp: string;
  description: string;
  photoUrl?: string;
  aiAnalysis?: {
    possibleHazard: string;
    severity: RiskLevel;
    confidence: number;
    recommended: string;
    observations?: string;
    mode?: 'gemini' | 'demo';
  };
  status: 'Received' | 'Field Inspected' | 'SDRF Dispatched' | 'Cleared';
}

export type NavTab = 'overview' | 'map' | 'alerts' | 'report';
