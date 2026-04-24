// STEP 1 — HTML5 Geolocation API
// Built into every browser. Free. No API key needed.
// Asks user permission to access device GPS coordinates.

export interface LocationResult {
  lat: number;
  lng: number;
  areaName: string;
}

export const requestLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
};

// STEP 2 — Nominatim Reverse Geocoding
// Free. No API key. No billing. Built on OpenStreetMap data.
// Converts raw GPS coordinates into human readable place name.
// Rate limit: max 1 request per second — never an issue at early stage.

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Mekh/1.0 (mekh.app)',
        },
      }
    );
    const data = await res.json();
    const address = data.address;
    // Return most specific available area name
    return (
      address?.suburb ||
      address?.neighbourhood ||
      address?.city_district ||
      address?.town ||
      address?.city ||
      address?.county ||
      'Kenya'
    );
  } catch {
    return 'Kenya';
  }
};

// STEP 3 — Combined: get coordinates AND area name together
export const getLocationWithName = async (): Promise<LocationResult> => {
  const position = await requestLocation();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const areaName = await reverseGeocode(lat, lng);
  return { lat, lng, areaName };
};

// Leaflet static county coordinates for technician profile maps
// Used when rendering a map on a technician profile page
export const COUNTY_COORDINATES: Record<string, [number, number]> = {
  'Nairobi': [-1.2921, 36.8219],
  'Mombasa': [-4.0435, 39.6682],
  'Kisumu': [-0.0917, 34.7680],
  'Nakuru': [-0.3031, 36.0800],
  'Eldoret': [0.5143, 35.2698],
  'Kiambu': [-1.1716, 36.8352],
  'Thika': [-1.0332, 37.0693],
  'Machakos': [-1.5177, 37.2634],
  'Nyeri': [-0.4167, 36.9500],
  'Meru': [0.0467, 37.6491],
  'Kisii': [-0.6817, 34.7667],
  'Kakamega': [0.2827, 34.7519],
  'Uasin Gishu': [0.5143, 35.2698],
};
