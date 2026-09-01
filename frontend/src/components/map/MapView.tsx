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
import { createConsumerMarkerIcon } from '@/components/map/ConsumerMarker';
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
}

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
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Google Maps Instance Refs
  const googleMapRef = useRef<any>(null);
  const googleMarkersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const officerMarkerRef = useRef<any>(null);
  const officerCircleRef = useRef<any>(null);

  // Leaflet Fallback Refs
  const leafletMapRef = useRef<any>(null);
  const leafletTileLayerRef = useRef<any>(null);
  const leafletMarkersRef = useRef<Map<string, any>>(new Map());
  const leafletRouteRef = useRef<any>(null);
  const leafletOfficerMarkerRef = useRef<any>(null);
  const leafletOfficerCircleRef = useRef<any>(null);

  // State
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet' | 'canvas'>('google');
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>('roadmap');
  // Default false: user controls map freely; only auto-follows during active navigation
  const [isFollowingInternal, setIsFollowingInternal] = useState<boolean>(false);

  const isFollowing = navState?.isFollowing ?? isFollowingInternal;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const officerCoordsRef = useRef(officerCoords);
  officerCoordsRef.current = officerCoords;

  const onSelectCustomerRef = useRef(onSelectCustomer);
  onSelectCustomerRef.current = onSelectCustomer;

  const onToggleFollowRef = useRef(onToggleFollow);
  onToggleFollowRef.current = onToggleFollow;

  const lastFittedPathKeyRef = useRef<string>('');

  const disableFollowMode = useCallback(() => {
    if (onToggleFollowRef.current) {
      onToggleFollowRef.current();
    } else {
      setIsFollowingInternal(false);
    }
  }, []);

  // Auto-enable follow mode when navigation starts; reset map when navigation ends
  useEffect(() => {
    if (navState?.active) {
      setIsFollowingInternal(true);
    } else {
      // Navigation ended - reset tilt/heading to normal map view
      if (mapEngine === 'google' && googleMapRef.current && (window as any).google) {
        googleMapRef.current.setTilt(0);
        googleMapRef.current.setHeading(0);
      }
      setIsFollowingInternal(false);
    }
  }, [navState?.active, mapEngine]);

  // 1. Initialize Leaflet OpenStreetMap Fallback with CartoDB Voyager tiles (Clear City & Ward Labels)
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
      if (!L || !mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        const centerLat = officerCoordsRef.current?.latitude || 21.1458;
        const centerLng = officerCoordsRef.current?.longitude || 79.0882;

        leafletMapRef.current = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 14,
          zoomControl: false,
        });

        // CartoDB Voyager Tile Layer with explicit city, neighborhood, and street labels
        const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        leafletTileLayerRef.current = L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(leafletMapRef.current);

        leafletMapRef.current.on('dragstart zoomstart', () => {
          disableFollowMode();
        });
      }
      setMapEngine('leaflet');
    };

    if ((window as any).L) {
      startLeaflet();
      return;
    }

    const scriptId = 'leaflet-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => startLeaflet();
      script.onerror = () => setMapEngine('canvas');
      document.head.appendChild(script);
    }
  }, [disableFollowMode]);

  // 2. Initialize Google Maps API with explicit City, Neighborhood, and Road Labels enabled
  const initGoogleMap = useCallback(() => {
    if (!mapContainerRef.current || !(window as any).google || googleMapRef.current) return;
    const google = (window as any).google;

    const centerLat = officerCoordsRef.current?.latitude || 21.1458;
    const centerLng = officerCoordsRef.current?.longitude || 79.0882;

    const mapOptions = {
      center: { lat: centerLat, lng: centerLng },
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      styles: [
        {
          featureType: 'administrative',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        },
        {
          featureType: 'locality',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        },
        {
          featureType: 'neighborhood',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        },
        {
          featureType: 'road',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    };

    googleMapRef.current = new google.maps.Map(mapContainerRef.current, mapOptions);
    infoWindowRef.current = new google.maps.InfoWindow();
    directionsServiceRef.current = new google.maps.DirectionsService();

    // Only disable follow if user manually drags (not on zoom)
    googleMapRef.current.addListener('dragstart', () => disableFollowMode());

    routePolylineRef.current = new google.maps.Polyline({
      map: googleMapRef.current,
      strokeColor: '#0284c7',
      strokeWeight: 7,
      strokeOpacity: 0.9,
      zIndex: 990,
    });

    setMapEngine('google');
  }, [disableFollowMode]);

  // Auth failure handler (logs warning without wiping map container)
  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps API key notice received.');
    };
  }, []);

  // Load Map Engine
  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      initLeafletMap();
      return;
    }

    if ((window as any).google && (window as any).google.maps) {
      initGoogleMap();
      return;
    }

    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker`;
      script.async = true;
      script.onload = () => initGoogleMap();
      script.onerror = () => initLeafletMap();
      document.head.appendChild(script);
    }
  }, [apiKey, initGoogleMap, initLeafletMap]);

  // Switch Google Maps Layer (Roadmap, Satellite, Hybrid, Terrain)
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
    } else if (mapEngine === 'leaflet' && leafletTileLayerRef.current && (window as any).L) {
      const urls: Record<MapLayerType, string> = {
        roadmap: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        hybrid: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      };
      leafletTileLayerRef.current.setUrl(urls[layer]);
    }
  };

  // Follow-Me Camera Pan & Officer Marker Update (Google Maps)
  useEffect(() => {
    if (mapEngine !== 'google' || !googleMapRef.current || !(window as any).google || !officerCoords) return;
    const google = (window as any).google;

    const pos = { lat: officerCoords.latitude, lng: officerCoords.longitude };

    // Update or create Officer Marker
    if (!officerMarkerRef.current) {
      officerMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: googleMapRef.current,
        title: 'You Are Here (Officer GPS)',
        icon: createOfficerMarkerIcon(google, officerHeading),
        zIndex: 1000,
      });
    } else {
      officerMarkerRef.current.setPosition(pos);
      officerMarkerRef.current.setIcon(createOfficerMarkerIcon(google, officerHeading));
    }

    // Follow-Me mode: only auto-pan when navigation is active or user explicitly turned it on
    const isNavigationActive = navState?.active === true;
    if (isFollowing && (isNavigationActive || isFollowingInternal)) {
      googleMapRef.current.panTo(pos);
      // 3D tilt for navigation mode (Google Maps style driving view)
      if (isNavigationActive) {
        googleMapRef.current.setTilt(45);
        googleMapRef.current.setZoom(17);
        if (officerHeading !== null && officerHeading !== undefined) {
          googleMapRef.current.setHeading(officerHeading);
        }
      } else {
        googleMapRef.current.setTilt(0);
      }
    }
  }, [mapEngine, officerCoords, officerHeading, isFollowing, isFollowingInternal, navState?.active]);

  // Render Google Maps Consumer Markers & Polyline Route with In-Place Updates
  useEffect(() => {
    if (mapEngine !== 'google' || !googleMapRef.current || !(window as any).google) return;
    const google = (window as any).google;

    const currentCustomerIds = new Set(customers.map((c) => c.customer_id));

    // 1. Remove markers no longer in active customers list
    googleMarkersRef.current.forEach((marker, id) => {
      if (!currentCustomerIds.has(id)) {
        marker.setMap(null);
        googleMarkersRef.current.delete(id);
      }
    });

    // 2. Update existing or create new customer markers with Meter ID in small font
    customers.forEach((customer) => {
      const isSelected = selectedCustomer?.customer_id === customer.customer_id;
      const multiStop = multiRoute?.stops?.find((s) => s.customer_id === customer.customer_id);
      const isCurrentStop = multiStop && (multiStop.sequence - 1) === activeStopIndex;
      const pos = { lat: customer.latitude, lng: customer.longitude };
      const icon = createConsumerMarkerIcon(
        google,
        customer.status,
        customer.priority,
        isSelected || isCurrentStop,
        multiStop?.sequence,
        customer.meter_number
      );
      const zIndex = isSelected || isCurrentStop ? 999 : 100;

      let marker = googleMarkersRef.current.get(customer.customer_id);
      if (marker) {
        marker.setPosition(pos);
        marker.setIcon(icon);
        marker.setZIndex(zIndex);
      } else {
        marker = new google.maps.Marker({
          position: pos,
          map: googleMapRef.current,
          title: `${customer.name} (Meter: ${customer.meter_number})`,
          icon,
          zIndex,
        });

        marker.addListener('click', () => {
          onSelectCustomerRef.current(customer);
          if (infoWindowRef.current) {
            const contentStr = `
              <div style="padding:8px; color:#0f172a; font-family:sans-serif; max-width:200px;">
                <h4 style="margin:0 0 4px; font-weight:bold; font-size:13px;">${customer.name}</h4>
                <p style="margin:0 0 4px; font-size:11px; color:#64748b;">Meter: <b>${customer.meter_number}</b></p>
                <p style="margin:0; font-size:14px; font-weight:900; color:#d97706;">₹${customer.pending_amount.toLocaleString('en-IN')}</p>
              </div>
            `;
            infoWindowRef.current.setContent(contentStr);
            infoWindowRef.current.open(googleMapRef.current, marker);
          }
        });

        googleMarkersRef.current.set(customer.customer_id, marker);
      }
    });

    // Render Route Polyline (Single clean active path to current target stop)
    const activePath = route?.coordinates_path && route.coordinates_path.length > 0
      ? route.coordinates_path
      : (multiRoute?.coordinates_path && multiRoute.coordinates_path.length > 0 ? multiRoute.coordinates_path : null);

    const pathKey = activePath && activePath.length > 0
      ? `${activePath.length}_${activePath[0].latitude}_${activePath[0].longitude}`
      : '';

    if (activePath && activePath.length > 0 && routePolylineRef.current) {
      const pathCoords = activePath.map((c) => ({ lat: c.latitude, lng: c.longitude }));
      routePolylineRef.current.setPath(pathCoords);
      routePolylineRef.current.setMap(googleMapRef.current);

      if (pathKey !== lastFittedPathKeyRef.current && !isFollowing) {
        const bounds = new google.maps.LatLngBounds();
        pathCoords.forEach((pt) => bounds.extend(pt));
        googleMapRef.current.fitBounds(bounds);
        lastFittedPathKeyRef.current = pathKey;
      }
    } else if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      lastFittedPathKeyRef.current = '';
    }
  }, [mapEngine, customers, selectedCustomer, route, multiRoute, activeStopIndex, isFollowing]);

  // Leaflet Fallback Marker & Route Effects
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current || !(window as any).L) return;
    const L = (window as any).L;

    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current.clear();

    customers.forEach((customer) => {
      const isSelected = selectedCustomer?.customer_id === customer.customer_id;
      const marker = L.marker([customer.latitude, customer.longitude]).addTo(leafletMapRef.current);
      marker.bindTooltip(`<b>Meter: ${customer.meter_number}</b>`, {
        permanent: true,
        direction: 'bottom',
        className: 'text-[9px] font-bold bg-slate-900 text-white px-1 py-0.5 rounded shadow-xs'
      });
      marker.on('click', () => onSelectCustomer(customer));
      leafletMarkersRef.current.set(customer.customer_id, marker);
    });

    if (officerCoords) {
      if (leafletOfficerMarkerRef.current) leafletOfficerMarkerRef.current.remove();
      leafletOfficerMarkerRef.current = L.marker([officerCoords.latitude, officerCoords.longitude]).addTo(leafletMapRef.current);
      if (isFollowing) {
        leafletMapRef.current.setView([officerCoords.latitude, officerCoords.longitude]);
      }
    }
  }, [mapEngine, customers, selectedCustomer, officerCoords, isFollowing, onSelectCustomer]);

  // Fit All Bounds Button Handler
  const handleFitAllBounds = () => {
    if (customers.length === 0) return;

    if (mapEngine === 'google' && googleMapRef.current && (window as any).google) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      if (officerCoords) bounds.extend({ lat: officerCoords.latitude, lng: officerCoords.longitude });
      customers.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }));
      googleMapRef.current.fitBounds(bounds);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current && (window as any).L) {
      const L = (window as any).L;
      const bounds = L.latLngBounds([]);
      if (officerCoords) bounds.extend([officerCoords.latitude, officerCoords.longitude]);
      customers.forEach((c) => bounds.extend([c.latitude, c.longitude]));
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const handleZoomIn = () => {
    if (mapEngine === 'google' && googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() + 1);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === 'google' && googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() - 1);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const toggleFollowMode = () => {
    if (onToggleFollow) {
      onToggleFollow();
    } else {
      setIsFollowingInternal((prev) => !prev);
    }
    // Snap camera to officer position when re-centering
    if (officerCoords && googleMapRef.current && (window as any).google) {
      googleMapRef.current.panTo({ lat: officerCoords.latitude, lng: officerCoords.longitude });
      googleMapRef.current.setZoom(navState?.active ? 17 : 15);
      googleMapRef.current.setTilt(0);
    } else if (officerCoords && leafletMapRef.current) {
      leafletMapRef.current.setView([officerCoords.latitude, officerCoords.longitude], 15);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 overflow-hidden select-none">
      {/* Real Google Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Navigation In-App Turn-by-Turn Panel */}
      {navState && (
        <NavigationPanel
          navState={navState}
          onExitNavigation={onExitNavigation || (() => {})}
          onCollectPayment={onCollectPayment}
        />
      )}

      {/* Floating Action Map Controls */}
      <MapControls
        currentLayer={currentLayer}
        isFollowing={isFollowing}
        onToggleFollow={toggleFollowMode}
        onSelectLayer={handleSelectLayer}
        onFitBounds={handleFitAllBounds}
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
