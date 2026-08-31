/**
 * 360° Street View Service
 * Checks availability of Google Street View panoramas near consumer coordinates.
 */

export interface StreetViewCheckResult {
  available: boolean;
  panoId?: string;
  lat?: number;
  lng?: number;
  message?: string;
}

export const checkStreetViewAvailability = async (
  lat: number,
  lng: number,
  radiusMeters: number = 50
): Promise<StreetViewCheckResult> => {
  if (typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps) {
    return { available: false, message: 'Google Maps API is not loaded.' };
  }

  return new Promise((resolve) => {
    try {
      const svService = new (window as any).google.maps.StreetViewService();
      const location = new (window as any).google.maps.LatLng(lat, lng);

      svService.getPanorama(
        { location, radius: radiusMeters, source: (window as any).google.maps.StreetViewSource.OUTDOOR },
        (data: any, status: any) => {
          if (status === (window as any).google.maps.StreetViewStatus.OK && data && data.location) {
            resolve({
              available: true,
              panoId: data.location.pano,
              lat: data.location.latLng.lat(),
              lng: data.location.latLng.lng(),
            });
          } else {
            resolve({
              available: false,
              message: '360° Street View is not available at this location.',
            });
          }
        }
      );
    } catch (err) {
      console.warn('Street View check failed:', err);
      resolve({ available: false, message: 'Failed to verify Street View imagery.' });
    }
  });
};
