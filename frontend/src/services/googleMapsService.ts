/**
 * Google Maps Loader & Geocoding Service
 * Secure browser-side loader for Google Maps JavaScript API.
 */

let scriptLoadPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();

  if ((window as any).google && (window as any).google.maps) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return Promise.reject(new Error('Google Maps API Key is missing or invalid.'));
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-js-sdk');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();

    script.onerror = (error) => {
      scriptLoadPromise = null;
      reject(error);
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  if (typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps) {
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  try {
    const geocoder = new (window as any).google.maps.Geocoder();
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results && response.results.length > 0) {
      return response.results[0].formatted_address;
    }
  } catch (err) {
    console.warn('Reverse geocoding failed:', err);
  }

  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};
