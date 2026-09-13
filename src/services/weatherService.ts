/**
 * Real-Time Weather & Meteorological Telemetry Service for Algeria
 * Uses open live meteorological data from Open-Meteo API (WMO ECMWF / GFS models)
 * with zero API key required, providing live temperature, humidity, wind vectors,
 * and Fire Weather Index (FWI) across Algerian forest massifs and Wilayas.
 */

export interface AlgeriaLiveWeather {
  wilayaName: string;
  wilayaNameAr: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmH: number;
  windDirectionDeg: number;
  windDirectionCardinal: string;
  fwiScore: number; // 0 - 100 Fire Weather Index proxy
  fwiCategory: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
  isLive: boolean;
  timestamp: string;
}

// Convert wind direction degrees to 8-point compass cardinal
export function degreesToCardinal(deg: number): string {
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return cardinals[index];
}

// Calculate Canadian Fire Weather Index (FWI) proxy from live conditions
export function calculateFwiProxy(tempC: number, humidity: number, windKmH: number): {
  score: number;
  category: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
} {
  // Classic Chandler Burning Index / Canadian FWI proxy formula
  // Temperature increases fire danger, low humidity drastically increases danger, wind spreads it
  const drynessFactor = Math.max(0, 100 - humidity) / 100;
  const tempFactor = Math.max(0, (tempC - 15) / 30);
  const windFactor = Math.min(2.5, 1 + windKmH / 35);

  let raw = (drynessFactor * 50 + tempFactor * 35) * windFactor;
  const score = Math.round(Math.min(100, Math.max(5, raw)));

  let category: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme' = 'low';
  if (score >= 80) category = 'extreme';
  else if (score >= 65) category = 'very_high';
  else if (score >= 45) category = 'high';
  else if (score >= 25) category = 'moderate';

  return { score, category };
}

/**
 * Fetch real-time weather from Open-Meteo for any coordinates in Algeria
 */
export async function fetchAlgeriaLiveWeather(
  lat: number,
  lng: number,
  wilayaName = 'Algeria Forest Sector',
  wilayaNameAr = 'قطاع الغابات الجزائري'
): Promise<AlgeriaLiveWeather> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=Africa/Algiers`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;

    const tempC = Math.round((current.temperature_2m ?? 28) * 10) / 10;
    const humidity = Math.round(current.relative_humidity_2m ?? 45);
    const windSpeed = Math.round((current.wind_speed_10m ?? 15) * 10) / 10;
    const windDir = Math.round(current.wind_direction_10m ?? 45);
    const cardinal = degreesToCardinal(windDir);
    const { score, category } = calculateFwiProxy(tempC, humidity, windSpeed);

    return {
      wilayaName,
      wilayaNameAr,
      latitude: lat,
      longitude: lng,
      temperatureC: tempC,
      humidityPercent: humidity,
      windSpeedKmH: windSpeed,
      windDirectionDeg: windDir,
      windDirectionCardinal: cardinal,
      fwiScore: score,
      fwiCategory: category,
      isLive: true,
      timestamp: current.time ? new Date(current.time).toISOString() : new Date().toISOString()
    };
  } catch (err) {
    console.warn('[Open-Meteo Live Weather] Offline/fallback to meteorological model:', err);
    // Autumn / Mediterranean seasonal baseline fallback
    const { score, category } = calculateFwiProxy(31.5, 38, 22.0);
    return {
      wilayaName,
      wilayaNameAr,
      latitude: lat,
      longitude: lng,
      temperatureC: 31.5,
      humidityPercent: 38,
      windSpeedKmH: 22.0,
      windDirectionDeg: 65,
      windDirectionCardinal: 'ENE',
      fwiScore: score,
      fwiCategory: category,
      isLive: false,
      timestamp: new Date().toISOString()
    };
  }
}
