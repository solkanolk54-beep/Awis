import { GeoCoordinates } from '../types';

export interface ThermalAnomaly {
  id: string;
  source: 'NASA_FIRMS_VIIRS' | 'SENTINEL_3_SLSTR' | 'ALSAT_2B_HIGH_RES' | 'LANDSAT_9_OLI';
  coordinates: GeoCoordinates;
  radiativePowerMW: number; // Fire Radiative Power (MW)
  brightnessTempKelvin: number;
  confidencePercent: number;
  acquisitionTimestamp: string;
  satelliteOrbit: 'ascending' | 'descending';
  pixelSizeMeters: number;
}

export interface VegetationHealthProduct {
  zoneId: string;
  ndviAverage: number; // Normalized Difference Vegetation Index (-1 to +1)
  fuelMoistureStressIndex: number; // 0-100 (stress)
  lastOverpassDate: string;
  burnScarCandidateHectares: number;
  cloudCoverPercent: number;
}

/**
 * Standardized interface for national satellite feeds and remote sensing integration
 */
export interface SatelliteDataProvider {
  getProviderName(): string;
  fetchActiveThermalHotspots(bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }): Promise<ThermalAnomaly[]>;
  getVegetationHealth(zoneId: string): Promise<VegetationHealthProduct>;
  getBurnedAreaEstimate(incidentId: string): Promise<{ burnedHectares: number; confidence: number }>;
}

export class NASA_FIRMS_Provider implements SatelliteDataProvider {
  getProviderName(): string {
    return 'NASA FIRMS (VIIRS SNPP & NOAA-20/21)';
  }

  async fetchActiveThermalHotspots(): Promise<ThermalAnomaly[]> {
    return [
      {
        id: 'FIRMS-DZ-9021',
        source: 'NASA_FIRMS_VIIRS',
        coordinates: { lat: 36.7812, lng: 5.7225 },
        radiativePowerMW: 342.5,
        brightnessTempKelvin: 382.4,
        confidencePercent: 96,
        acquisitionTimestamp: new Date().toISOString(),
        satelliteOrbit: 'ascending',
        pixelSizeMeters: 375
      }
    ];
  }

  async getVegetationHealth(zoneId: string): Promise<VegetationHealthProduct> {
    return {
      zoneId,
      ndviAverage: 0.42,
      fuelMoistureStressIndex: 78,
      lastOverpassDate: '2026-09-04 10:45 UTC',
      burnScarCandidateHectares: 4.8,
      cloudCoverPercent: 2.1
    };
  }

  async getBurnedAreaEstimate(): Promise<{ burnedHectares: number; confidence: number }> {
    return { burnedHectares: 5.2, confidence: 93 };
  }
}

export class ALSAT_AlgerianRemoteSensingProvider implements SatelliteDataProvider {
  getProviderName(): string {
    return 'Algerian Space Agency (ASAL / ALSAT-2A & 2B)';
  }

  async fetchActiveThermalHotspots(): Promise<ThermalAnomaly[]> {
    return [
      {
        id: 'ALSAT-HOT-04',
        source: 'ALSAT_2B_HIGH_RES',
        coordinates: { lat: 36.7808, lng: 5.7218 },
        radiativePowerMW: 320.0,
        brightnessTempKelvin: 375.8,
        confidencePercent: 98,
        acquisitionTimestamp: new Date().toISOString(),
        satelliteOrbit: 'descending',
        pixelSizeMeters: 2.5
      }
    ];
  }

  async getVegetationHealth(zoneId: string): Promise<VegetationHealthProduct> {
    return {
      zoneId,
      ndviAverage: 0.39,
      fuelMoistureStressIndex: 82,
      lastOverpassDate: '2026-09-04 11:30 UTC',
      burnScarCandidateHectares: 4.9,
      cloudCoverPercent: 1.0
    };
  }

  async getBurnedAreaEstimate(): Promise<{ burnedHectares: number; confidence: number }> {
    return { burnedHectares: 4.85, confidence: 97 };
  }
}
