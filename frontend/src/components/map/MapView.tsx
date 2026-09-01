'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Customer,
  Coordinates,
  RouteCalculationResult,
  MultiRouteCalculationResult,
  MapLayerType,
  NavigationState,
  StreetViewState,
} from '@/types';
import { createOfficerMarkerIcon } from '@/components/map/OfficerMarker';
import MapControls from '@/components/map/MapControls';
import NavigationPanel from '@/components/map/NavigationPanel';
import StreetViewModal from '@/components/map/StreetViewModal';

interface MapViewProps {
  customers: Customer[];
  officerCoords: Coordinates | null;
  officerHeading?: number | null;
  selectedCustomer: Customer | null;
  route: RouteCalculationResult | null;
  multiRoute?: MultiRouteCalculationResult | null;
  activeStopIndex?: number;
  navState?: NavigationState;
  streetView?: StreetViewState;
  onSelectCustomer: (customer: Customer) => void;
  onExitNavigation?: () => void;
  onCollectPayment?: () => void;
  onOpenStreetView?: (customer: Customer) => void;
  onCloseStreetView?: () => void;
  onToggleFollow?: () => void;
  onDirectionsCalculated?: (result: RouteCalculationResult) => void;
}

// ─── Marker icon helpers ──────────────────────────────────────────────────────

function buildConsumerMarkerSvg(
  status: string,
  priority: string | undefined,
  isSelected: boolean,
  sequence?: number,
  meterNumber?: string
): string {
  // Status colors
  const colorMap: Record<string, string> = {
    overdue: '#ef4444',
    pending: '#f59e0b',
    partially_paid: '#3b82f6',
    paid: '#22c55e',
  };
  const priorityColor = priority === 'critical' ? '#dc2626' : priority === 'high' ? '#f97316' : null;
  const baseColor = isSelected ? '#0284c7' : priorityColor || colorMap[status] || '#64748b';

  const meterText = meterNumber
    ? meterNumber.startsWith('MTR') ? meterNumber : `MTR-${meterNumber.slice(-6)}`
    : '';

  const pinInner = sequence !== undefined
    ? `<text x="17" y="23" text-anchor="middle" fill="#FFF" font-size="13" font-weight="900" font-family="sans-serif">${sequence}</text>`
    : `<circle cx="17" cy="17" r="9" fill="#0F172A"/><path d="M16 9L11 18H16L15 25L21 15H16L17 9Z" fill="${baseColor}"/>`;

  const badgeSvg = meterText
    ? `<rect x="2" y="39" width="70" height="16" rx="4" fill="#0F172A" stroke="#FFF" stroke-width="1.5"/>
       <text x="37" y="50.5" text-anchor="middle" fill="#FFF" font-size="8.5" font-weight="800" font-family="sans-serif" letter-spacing="0.2">${meterText}</text>`
    : '';

  const totalH = meterText ? 56 : 40;
  return `<svg width="74" height="${totalH}" viewBox="0 0 74 ${totalH}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(20,0)">
      <path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 38 17 38C17 38 34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="${baseColor}" stroke="#FFF" stroke-width="2"/>
      ${pinInner}
    </g>
    ${badgeSvg}
  </svg>`;
}

async function fetchOSRMPath(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ coordinates: Coordinates[]; distanceMeters: number; durationSeconds: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route0 = data.routes[0];
        const geoCoords = route0.geometry?.coordinates || [];
        const coordinates: Coordinates[] = geoCoords.map((pt: [number, number]) => ({
          latitude: pt[1],
          longitude: pt[0],
        }));
        return {
          coordinates,
          distanceMeters: route0.distance || 0,
          durationSeconds: route0.duration || 0,
        };
      }
    }
  } catch (e) {
    console.warn('OSRM path fetch error:', e);
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MapView({
  customers,
  officerCoords,
  officerHeading = null,
  selectedCustomer,
  route,
  multiRoute,
  activeStopIndex = 0,
  navState,
  streetView,
  onSelectCustomer,
  onExitNavigation,
  onCollectPayment,
  onOpenStreetView,
  onCloseStreetView,
  onToggleFollow,
  onDirectionsCalculated,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Google Maps refs
  const googleMapRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);  // Real road route renderer
  const infoWindowRef = useRef<any>(null);
  const officerMarkerRef = useRef<any>(null);
  const customerMarkersRef = useRef<Map<string, any>>(new Map());
  const fallbackPolylineRef = useRef<any>(null);

  // Leaflet fallback refs
  const leafletMapRef = useRef<any>(null);
  const leafletTileLayerRef = useRef<any>(null);
  const leafletMarkersRef = useRef<Map<string, any>>(new Map());
  const leafletOfficerMarkerRef = useRef<any>(null);
  const leafletRoutePoly = useRef<any>(null);

  // Last direction request fingerprint (avoids duplicate API calls)
  const lastDirectionsKeyRef = useRef<string>('');

  // State
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet' | 'canvas'>('google');
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>('roadmap');
  const [isFollowingInternal, setIsFollowingInternal] = useState<boolean>(false);
  const [is3D, setIs3D] = useState<boolean>(false);
  const [mapHeading, setMapHeading] = useState<number>(officerHeading || 0);

  const isFollowing = navState?.isFollowing ?? isFollowingInternal;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Stable refs for callbacks
  const officerCoordsRef = useRef(officerCoords);
  officerCoordsRef.current = officerCoords;
  const onSelectCustomerRef = useRef(onSelectCustomer);
  onSelectCustomerRef.current = onSelectCustomer;
  const onToggleFollowRef = useRef(onToggleFollow);
  onToggleFollowRef.current = onToggleFollow;
  const onDirectionsCalculatedRef = useRef(onDirectionsCalculated);
  onDirectionsCalculatedRef.current = onDirectionsCalculated;

  // FIX: Keep initGoogleMap in a ref so the async script callback always
  // calls the LATEST version, not a stale closure captured at script-append time.
  const initGoogleMapRef = useRef<() => void>(() => {});

  // ── Auto follow on navigation start/stop ────────────────────────────────────
  useEffect(() => {
    if (navState?.active) {
      setIsFollowingInternal(true);
    } else {
      // Reset 3D view when navigation ends
      if (mapEngine === 'google' && googleMapRef.current && (window as any).google) {
        googleMapRef.current.setTilt(0);
        googleMapRef.current.setHeading(0);
        googleMapRef.current.setZoom(15);
      }
      setIsFollowingInternal(false);
    }
  }, [navState?.active, mapEngine]);

  // ── disableFollowMode (stable) ───────────────────────────────────────────────
  const disableFollowMode = useCallback(() => {
    if (onToggleFollowRef.current) {
      onToggleFollowRef.current();
    } else {
      setIsFollowingInternal(false);
    }
  }, []);

  // ── 1. Init Leaflet fallback ─────────────────────────────────────────────────
  const initLeafletMap = useCallback(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const startLeaflet = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current || leafletMapRef.current) return;

      const centerLat = officerCoordsRef.current?.latitude || 21.1458;
      const centerLng = officerCoordsRef.current?.longitude || 79.0882;

      leafletMapRef.current = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: false,
      });

      leafletTileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, attribution: '© OpenStreetMap © CARTO' }
      ).addTo(leafletMapRef.current);

      leafletMapRef.current.on('dragstart zoomstart', () => disableFollowMode());
      setMapEngine('leaflet');
    };

    if ((window as any).L) { startLeaflet(); return; }

    const scriptId = 'leaflet-script';
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.async = true;
      s.onload = startLeaflet;
      s.onerror = () => setMapEngine('canvas');
      document.head.appendChild(s);
    }
  }, [disableFollowMode]);

  // ── 2. Init Google Maps ──────────────────────────────────────────────────────
  const initGoogleMap = useCallback(() => {
    if (!mapContainerRef.current || !(window as any).google || googleMapRef.current) return;
    const google = (window as any).google;

    const centerLat = officerCoordsRef.current?.latitude || 21.1458;
    const centerLng = officerCoordsRef.current?.longitude || 79.0882;

    googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapId: 'MAHAVITARAN_3D_NAV_MAP',
      tiltInteractionEnabled: true,
      headingInteractionEnabled: true,
      tilt: 0,
      heading: 0,
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
    });

    infoWindowRef.current = new google.maps.InfoWindow();
    directionsServiceRef.current = new google.maps.DirectionsService();

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: googleMapRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#0284c7',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        zIndex: 990,
      },
    });

    // Listen to manual 2-finger heading rotation & 3D tilt gestures
    googleMapRef.current.addListener('heading_changed', () => {
      const h = googleMapRef.current.getHeading() || 0;
      setMapHeading(h);
    });

    googleMapRef.current.addListener('tilt_changed', () => {
      const t = googleMapRef.current.getTilt() || 0;
      setIs3D(t > 0);
    });

    // Only disable follow on user drag
    googleMapRef.current.addListener('dragstart', () => disableFollowMode());

    setMapEngine('google');
  }, [disableFollowMode]);

  // Keep ref in sync with latest initGoogleMap
  useEffect(() => { initGoogleMapRef.current = initGoogleMap; }, [initGoogleMap]);

  // ── 3. Google Maps auth failure handler ─────────────────────────────────────
  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.error('Google Maps API key auth failure — falling back to Leaflet.');
      setMapError('Google Maps API key error. Using OpenStreetMap fallback.');
      // Destroy broken google map container state and switch to Leaflet
      googleMapRef.current = null;
      initLeafletMap();
    };
  }, [initLeafletMap]);

  // ── 4. Load Google Maps Script ───────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      initLeafletMap();
      return;
    }

    // Already loaded
    if ((window as any).google?.maps) {
      initGoogleMap();
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      // Script tag exists but google not ready yet — wait
      const existing = document.getElementById(scriptId);
      existing?.addEventListener('load', initGoogleMap);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    // Using 'weekly' channel ensures latest stable API. No deprecated libraries.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&v=weekly&callback=__mahavitaranMapReady`;
    script.async = true;
    script.defer = true;

    // FIX: Use initGoogleMapRef.current so the callback always calls the
    // latest version of initGoogleMap, not a stale closure from before any re-renders.
    (window as any).__mahavitaranMapReady = () => {
      initGoogleMapRef.current();
      delete (window as any).__mahavitaranMapReady;
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script — falling back to Leaflet.');
      setMapError('Map failed to load. Using OpenStreetMap.');
      initLeafletMap();
    };

    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // ── 5. Draw Route Lines (Multi-Stop Polyline + Single Directions) ───────────────
  useEffect(() => {
    if (mapEngine !== 'google' || !googleMapRef.current) return;
    const google = (window as any).google;
    if (!google) return;

    // 1. MULTI-STOP ROUTE POLYLINE (Always render if multiRoute exists)
    const multiPath = multiRoute?.coordinates_path;
    if (multiPath && multiPath.length >= 2) {
      const pathLatLngs = multiPath
        .map((pt: any) => {
          const lat = typeof pt.latitude === 'number' ? pt.latitude : (typeof pt.lat === 'number' ? pt.lat : null);
          const lng = typeof pt.longitude === 'number' ? pt.longitude : (typeof pt.lng === 'number' ? pt.lng : null);
          if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            return new google.maps.LatLng(lat, lng);
          }
          return null;
        })
        .filter(Boolean);

      if (pathLatLngs.length >= 2) {
        if (!fallbackPolylineRef.current) {
          fallbackPolylineRef.current = new google.maps.Polyline({
            map: googleMapRef.current,
            path: pathLatLngs,
            strokeColor: '#0284c7',
            strokeWeight: 7,
            strokeOpacity: 0.95,
            zIndex: 9999,
          });
        } else {
          fallbackPolylineRef.current.setPath(pathLatLngs);
          fallbackPolylineRef.current.setMap(googleMapRef.current);
        }

        // Auto-fit camera bounds to display all 16 stops & route line
        const bounds = new google.maps.LatLngBounds();
        pathLatLngs.forEach((pt: any) => bounds.extend(pt));
        if (!bounds.isEmpty()) {
          googleMapRef.current.fitBounds(bounds, { top: 90, bottom: 90, left: 90, right: 90 });
        }
      }
    } else {
      // Single route fallback if route prop exists
      const singlePath = route?.coordinates_path;
      if (singlePath && singlePath.length >= 2) {
        const pathLatLngs = singlePath
          .map((pt: any) => {
            const lat = typeof pt.latitude === 'number' ? pt.latitude : (typeof pt.lat === 'number' ? pt.lat : null);
            const lng = typeof pt.longitude === 'number' ? pt.longitude : (typeof pt.lng === 'number' ? pt.lng : null);
            if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
              return new google.maps.LatLng(lat, lng);
            }
            return null;
          })
          .filter(Boolean);

        if (pathLatLngs.length >= 2) {
          if (!fallbackPolylineRef.current) {
            fallbackPolylineRef.current = new google.maps.Polyline({
              map: googleMapRef.current,
              path: pathLatLngs,
              strokeColor: '#0284c7',
              strokeWeight: 7,
              strokeOpacity: 0.95,
              zIndex: 9999,
            });
          } else {
            fallbackPolylineRef.current.setPath(pathLatLngs);
            fallbackPolylineRef.current.setMap(googleMapRef.current);
          }
        }
      } else if (fallbackPolylineRef.current) {
        fallbackPolylineRef.current.setMap(null);
      }
    }

    // 2. SINGLE LEG DIRECTIONS SERVICE (Only for single navigation or single pin preview)
    const isSingleNav = navState?.active && !multiRoute;
    const dest = isSingleNav ? navState.targetCustomer : (selectedCustomer && !multiRoute ? selectedCustomer : null);

    if (!directionsServiceRef.current || !directionsRendererRef.current || !dest) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      return;
    }

    const originLat = officerCoords?.latitude ?? 21.1458;
    const originLng = officerCoords?.longitude ?? 79.0882;

    const fingerprint = `${originLat.toFixed(3)}_${originLng.toFixed(3)}_${dest.customer_id}`;
    if (fingerprint === lastDirectionsKeyRef.current) return;
    lastDirectionsKeyRef.current = fingerprint;

    const request = {
      origin: new google.maps.LatLng(originLat, originLng),
      destination: new google.maps.LatLng(dest.latitude, dest.longitude),
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
    };

    directionsServiceRef.current.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
        directionsRendererRef.current.setMap(googleMapRef.current);
        directionsRendererRef.current.setDirections(result);

        if (onDirectionsCalculatedRef.current) {
          const route0 = result.routes[0];
          const leg0 = route0.legs && route0.legs.length > 0 ? route0.legs[0] : null;

          const steps = leg0 && leg0.steps ? leg0.steps.map((s: any) => ({
            instruction: s.instructions ? s.instructions.replace(/<[^>]*>/g, '') : '',
            distance_text: s.distance ? s.distance.text : '',
            duration_text: s.duration ? s.duration.text : '',
            start_location: s.start_location ? { latitude: s.start_location.lat(), longitude: s.start_location.lng() } : undefined,
            end_location: s.end_location ? { latitude: s.end_location.lat(), longitude: s.end_location.lng() } : undefined,
          })) : [];

          const pathCoords: Coordinates[] = route0.overview_path ? route0.overview_path.map((pt: any) => ({
            latitude: pt.lat(),
            longitude: pt.lng(),
          })) : [];

          onDirectionsCalculatedRef.current({
            distance_meters: leg0 && leg0.distance ? leg0.distance.value : 0,
            distance_text: leg0 && leg0.distance ? leg0.distance.text : '0 m',
            duration_seconds: leg0 && leg0.duration ? leg0.duration.value : 0,
            duration_text: leg0 && leg0.duration ? leg0.duration.text : '0 min',
            start_address: leg0 ? leg0.start_address : '',
            end_address: leg0 ? leg0.end_address : '',
            encoded_polyline: route0.overview_polyline || '',
            coordinates_path: pathCoords,
            steps,
          });
        }
      } else {
        directionsRendererRef.current.setMap(null);
      }
    });
  }, [
    mapEngine,
    officerCoords,
    navState?.targetCustomer,
    selectedCustomer,
    multiRoute,
    activeStopIndex,
    navState?.active,
    route,
  ]);

  // ── 6. Officer GPS Marker + Follow-Me Camera ─────────────────────────────────
  useEffect(() => {
    if (mapEngine !== 'google' || !googleMapRef.current || !(window as any).google || !officerCoords) return;
    const google = (window as any).google;

    const pos = { lat: officerCoords.latitude, lng: officerCoords.longitude };

    if (!officerMarkerRef.current) {
      officerMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: googleMapRef.current,
        title: 'You (Field Officer)',
        icon: createOfficerMarkerIcon(google, officerHeading),
        zIndex: 1000,
      });
    } else {
      officerMarkerRef.current.setPosition(pos);
      officerMarkerRef.current.setIcon(createOfficerMarkerIcon(google, officerHeading));
    }

    // Follow-Me: pan camera without forcing constant zoom level reset
    if (isFollowing) {
      googleMapRef.current.panTo(pos);
      if (navState?.active) {
        googleMapRef.current.setTilt(45);
        if (officerHeading !== null && officerHeading !== undefined && !isNaN(officerHeading)) {
          googleMapRef.current.setHeading(officerHeading);
        }
      } else {
        googleMapRef.current.setTilt(0);
      }
    }
  }, [mapEngine, officerCoords, officerHeading, isFollowing, navState?.active]);

  // ── 7. Customer Markers (Google Maps) ───────────────────────────────────────
  useEffect(() => {
    if (mapEngine !== 'google' || !googleMapRef.current || !(window as any).google) return;
    const google = (window as any).google;

    const currentIds = new Set(customers.map((c) => c.customer_id));

    // Remove stale markers
    customerMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        customerMarkersRef.current.delete(id);
      }
    });

    customers.forEach((customer) => {
      const isSelected = selectedCustomer?.customer_id === customer.customer_id;
      const multiStop = multiRoute?.stops?.find((s) => s.customer_id === customer.customer_id);
      const isCurrentStop = multiStop && (multiStop.sequence - 1) === activeStopIndex;

      const svgStr = buildConsumerMarkerSvg(
        customer.status,
        customer.priority,
        isSelected || !!isCurrentStop,
        multiStop?.sequence,
        customer.meter_number
      );

      const icon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgStr),
        scaledSize: new google.maps.Size(isSelected ? 84 : 74, isSelected ? 66 : 56),
        anchor: new google.maps.Point(isSelected ? 42 : 37, isSelected ? 48 : 38),
      };

      const pos = { lat: customer.latitude, lng: customer.longitude };
      let marker = customerMarkersRef.current.get(customer.customer_id);

      if (marker) {
        marker.setPosition(pos);
        marker.setIcon(icon);
        marker.setZIndex(isSelected || isCurrentStop ? 999 : 100);
      } else {
        marker = new google.maps.Marker({
          position: pos,
          map: googleMapRef.current,
          title: `${customer.name} — Meter: ${customer.meter_number}`,
          icon,
          zIndex: isSelected || isCurrentStop ? 999 : 100,
        });

        marker.addListener('click', () => {
          onSelectCustomerRef.current(customer);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="padding:8px;color:#0f172a;font-family:sans-serif;max-width:200px;">
                <h4 style="margin:0 0 4px;font-weight:bold;font-size:13px;">${customer.name}</h4>
                <p style="margin:0 0 2px;font-size:11px;color:#64748b;">Meter: <b>${customer.meter_number}</b></p>
                <p style="margin:0;font-size:14px;font-weight:900;color:#d97706;">₹${customer.pending_amount.toLocaleString('en-IN')}</p>
              </div>
            `);
            infoWindowRef.current.open(googleMapRef.current, marker);
          }
        });

        customerMarkersRef.current.set(customer.customer_id, marker);
      }
    });
  }, [mapEngine, customers, selectedCustomer, multiRoute, activeStopIndex]);

  // ── 8. Leaflet Fallback: Officer + Customers + Route ─────────────────────────
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current || !(window as any).L) return;
    const L = (window as any).L;

    // Officer marker
    if (officerCoords) {
      if (leafletOfficerMarkerRef.current) leafletOfficerMarkerRef.current.remove();
      leafletOfficerMarkerRef.current = L.circleMarker(
        [officerCoords.latitude, officerCoords.longitude],
        { radius: 10, fillColor: '#0284c7', color: '#fff', weight: 2, fillOpacity: 1 }
      ).addTo(leafletMapRef.current);
      if (isFollowing) {
        leafletMapRef.current.setView([officerCoords.latitude, officerCoords.longitude]);
      }
    }

    // Customer markers
    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current.clear();
    customers.forEach((customer) => {
      const isSelected = selectedCustomer?.customer_id === customer.customer_id;
      const marker = L.circleMarker([customer.latitude, customer.longitude], {
        radius: isSelected ? 12 : 8,
        fillColor: isSelected ? '#0284c7' : '#f59e0b',
        color: '#fff', weight: 2, fillOpacity: 1,
      }).addTo(leafletMapRef.current);
      marker.bindTooltip(`<b>${customer.meter_number}</b>`, { permanent: true, direction: 'top' });
      marker.on('click', () => onSelectCustomerRef.current(customer));
      leafletMarkersRef.current.set(customer.customer_id, marker);
    });

    // Route polyline (Leaflet fallback uses backend coordinates)
    if (leafletRoutePoly.current) { leafletRoutePoly.current.remove(); leafletRoutePoly.current = null; }
    const activePath = route?.coordinates_path?.length ? route.coordinates_path
      : multiRoute?.coordinates_path?.length ? multiRoute.coordinates_path : null;
    if (activePath) {
      leafletRoutePoly.current = L.polyline(
        activePath.map((p) => [p.latitude, p.longitude]),
        { color: '#0284c7', weight: 5, opacity: 0.85 }
      ).addTo(leafletMapRef.current);
    }
  }, [mapEngine, officerCoords, customers, selectedCustomer, route, multiRoute, isFollowing]);

  // ── 9. Map Layer Switcher ────────────────────────────────────────────────────
  const handleSelectLayer = (layer: MapLayerType) => {
    setCurrentLayer(layer);
    if (mapEngine === 'google' && googleMapRef.current && (window as any).google) {
      const google = (window as any).google;
      const typeMap: Record<MapLayerType, any> = {
        roadmap: google.maps.MapTypeId.ROADMAP,
        satellite: google.maps.MapTypeId.SATELLITE,
        hybrid: google.maps.MapTypeId.HYBRID,
        terrain: google.maps.MapTypeId.TERRAIN,
      };
      googleMapRef.current.setMapTypeId(typeMap[layer]);
    } else if (mapEngine === 'leaflet' && leafletTileLayerRef.current) {
      const urls: Record<MapLayerType, string> = {
        roadmap: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        hybrid: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      };
      leafletTileLayerRef.current.setUrl(urls[layer]);
    }
  };

  // ── 10. Fit All Bounds ───────────────────────────────────────────────────────
  const handleFitAllBounds = () => {
    if (mapEngine === 'google' && googleMapRef.current && (window as any).google) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      if (officerCoords) bounds.extend({ lat: officerCoords.latitude, lng: officerCoords.longitude });
      customers.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }));
      if (!bounds.isEmpty()) googleMapRef.current.fitBounds(bounds);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current && (window as any).L) {
      const L = (window as any).L;
      const pts: [number, number][] = [];
      if (officerCoords) pts.push([officerCoords.latitude, officerCoords.longitude]);
      customers.forEach((c) => pts.push([c.latitude, c.longitude]));
      if (pts.length > 0) leafletMapRef.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
    }
  };

  // ── 11. Zoom controls ────────────────────────────────────────────────────────
  const handleZoomIn = () => {
    disableFollowMode();
    if (mapEngine === 'google' && googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom() || 15;
      googleMapRef.current.setZoom(Math.min(currentZoom + 1, 21));
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    disableFollowMode();
    if (mapEngine === 'google' && googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom() || 15;
      googleMapRef.current.setZoom(Math.max(currentZoom - 1, 3));
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  // ── 12. Compass Reset True North ──────────────────────────────────────────────
  const handleResetNorth = () => {
    if (mapEngine === 'google' && googleMapRef.current && (window as any).google) {
      googleMapRef.current.setHeading(0);
      googleMapRef.current.setTilt(0);
      if (officerCoords) {
        googleMapRef.current.panTo({ lat: officerCoords.latitude, lng: officerCoords.longitude });
      }
    } else if (officerCoords && leafletMapRef.current) {
      leafletMapRef.current.setView([officerCoords.latitude, officerCoords.longitude]);
    }
  };

  // ── 13. 3D Perspective Tilt Toggle ──────────────────────────────────────────
  const handleToggle3DTilt = () => {
    if (mapEngine === 'google' && googleMapRef.current) {
      const currentTilt = googleMapRef.current.getTilt() || 0;
      const nextTilt = currentTilt > 0 ? 0 : 45;
      googleMapRef.current.setTilt(nextTilt);
      setIs3D(nextTilt > 0);
    }
  };

  // ── 14. Re-center / Follow Toggle ───────────────────────────────────────────
  const toggleFollowMode = () => {
    if (onToggleFollow) {
      onToggleFollow();
    } else {
      setIsFollowingInternal((prev) => !prev);
    }
    // Snap camera to officer position immediately
    if (officerCoords && googleMapRef.current && (window as any).google) {
      googleMapRef.current.panTo({ lat: officerCoords.latitude, lng: officerCoords.longitude });
      googleMapRef.current.setZoom(navState?.active ? 17 : 15);
      googleMapRef.current.setTilt(0);
    } else if (officerCoords && leafletMapRef.current) {
      leafletMapRef.current.setView([officerCoords.latitude, officerCoords.longitude], 15);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 overflow-hidden select-none">
      {/* Map tile container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* API error banner */}
      {mapError && (
        <div className="absolute top-2 left-2 right-2 z-50 bg-amber-500/95 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl shadow-lg flex items-center gap-2">
          <span>⚠️</span>
          <span>{mapError}</span>
          <button onClick={() => setMapError(null)} className="ml-auto text-slate-900 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Navigation Panel */}
      {navState && (
        <NavigationPanel
          navState={navState}
          onExitNavigation={onExitNavigation || (() => {})}
          onCollectPayment={onCollectPayment}
        />
      )}

      {/* Floating Map Controls */}
      <MapControls
        currentLayer={currentLayer}
        isFollowing={isFollowing}
        is3D={is3D}
        officerHeading={mapHeading || officerHeading}
        onToggleFollow={toggleFollowMode}
        onSelectLayer={handleSelectLayer}
        onFitBounds={handleFitAllBounds}
        onResetNorth={handleResetNorth}
        onToggle3D={handleToggle3DTilt}
        onOpenStreetView={
          selectedCustomer && onOpenStreetView
            ? () => onOpenStreetView(selectedCustomer)
            : undefined
        }
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* 360° Street View Modal */}
      {streetView && onCloseStreetView && (
        <StreetViewModal streetView={streetView} onClose={onCloseStreetView} />
      )}
    </div>
  );
}
