'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import MapView from '@/components/map/MapView';
import MapFilters from '@/components/map/MapFilters';
import CustomerBottomSheet from '@/components/map/CustomerBottomSheet';
import MultiRouteDisplay from '@/components/map/MultiRouteDisplay';
import PaymentModal from '@/components/payments/PaymentModal';
import ReceiptView from '@/components/payments/ReceiptView';
import OfflineSyncBanner from '@/components/offline/OfflineSyncBanner';


import {
  Customer,
  MapFilterState,
  MultiRouteCalculationResult,
  PaymentRecord,
} from '@/types';
import { customerService } from '@/services/customerService';
import { routeService } from '@/services/routeService';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNavigation } from '@/hooks/useNavigation';
import { useStreetView } from '@/hooks/useStreetView';
import { calculateHaversineDistance } from '@/utils/geo';

function MapPageContent() {
  const searchParams = useSearchParams();
  const targetCusId = searchParams.get('customer_id');
  const autoNav = searchParams.get('navigate') === 'true';

  const { coords: officerCoords, heading: officerHeading } = useGeolocation();

  const {
    isNavigating,
    targetCustomer: navTargetCustomer,
    route: activeRoute,
    currentStepIndex,
    isOffRoute,
    isFollowing,
    startNavigation,
    stopNavigation,
    recalculateRoute,
    updateOfficerPosition,
    toggleFollow,
  } = useNavigation({ offRouteThresholdMeters: 75 });

  const { streetView, openStreetView, closeStreetView } = useStreetView();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Multi-stop Route State
  const [multiRoute, setMultiRoute] = useState<MultiRouteCalculationResult | null>(null);
  const [isMultiNavigating, setIsMultiNavigating] = useState<boolean>(false);
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0);
  const [isCalculatingMultiRoute, setIsCalculatingMultiRoute] = useState<boolean>(false);

  const [filters, setFilters] = useState<MapFilterState>({
    status: 'all',
    searchQuery: '',
  });

  // Payment & Receipt Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [completedPayment, setCompletedPayment] = useState<PaymentRecord | null>(null);

  // Load Customers from backend
  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const data = await customerService.getCustomers({ all_officers: true });
      const safeData = Array.isArray(data) ? data : [];
      setAllCustomers(safeData);

      if (targetCusId) {
        const found = safeData.find((c) => c && c.customer_id === targetCusId);
        if (found) {
          setSelectedCustomer(found);
          if (autoNav && officerCoords) {
            startNavigation(found, officerCoords);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [targetCusId]);

  // Update officer position for navigation & off-route detection
  useEffect(() => {
    if (officerCoords && isNavigating) {
      updateOfficerPosition(officerCoords);
    }
  }, [officerCoords, isNavigating, updateOfficerPosition]);

  // Filter Customers for Map Display
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      // 1. Status Filter
      if (filters.status === 'pending' && c.status === 'paid') return false;
      if (filters.status === 'overdue' && c.status !== 'overdue' && c.priority !== 'high' && c.priority !== 'critical') return false;
      if (filters.status === 'collected' && c.status !== 'paid') return false;

      // 2. Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchId = c.customer_id.toLowerCase().includes(q);
        const matchMeter = c.meter_number.toLowerCase().includes(q);
        const matchAddr = c.address.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchMeter && !matchAddr) return false;
      }

      return true;
    });
  }, [allCustomers, filters]);

  // Count aggregates for filters
  const counts = useMemo(() => {
    return {
      all: allCustomers.length,
      pending: allCustomers.filter((c) => c.status !== 'paid').length,
      overdue: allCustomers.filter((c) => c.status === 'overdue' || c.priority === 'high' || c.priority === 'critical').length,
      paid: allCustomers.filter((c) => c.status === 'paid').length,
    };
  }, [allCustomers]);

  // Distance & Travel Time to selected customer
  const { distanceMeters, durationSeconds } = useMemo(() => {
    if (!selectedCustomer || !officerCoords) return { distanceMeters: undefined, durationSeconds: undefined };
    const dist = calculateHaversineDistance(
      officerCoords.latitude,
      officerCoords.longitude,
      selectedCustomer.latitude,
      selectedCustomer.longitude
    );
    const durSec = (dist * 1.35) / 6.94; // riding speed estimate
    return { distanceMeters: dist, durationSeconds: durSec };
  }, [selectedCustomer, officerCoords]);

  // Single Navigation Trigger Handler
  const handleStartSingleNavigation = (customer: Customer) => {
    if (isMultiNavigating) handleStopMultiNavigation();
    setSelectedCustomer(customer);
    startNavigation(customer, officerCoords);
  };

  // Multi-Stop Navigation Trigger Handler
  const handleStartMultiNavigation = async () => {
    if (filteredCustomers.length === 0) return;
    setIsCalculatingMultiRoute(true);

    const origin = officerCoords || {
      latitude: filteredCustomers[0].latitude,
      longitude: filteredCustomers[0].longitude,
    };

    try {
      const res = await routeService.calculateMultiRoute(origin, filteredCustomers);
      setMultiRoute(res);
      setCurrentStopIndex(0);
      setIsMultiNavigating(true);

      // Stop single route if active
      stopNavigation();

      if (res.stops.length > 0) {
        const firstCust = allCustomers.find((c) => c.customer_id === res.stops[0].customer_id);
        if (firstCust) setSelectedCustomer(firstCust);
      }
    } catch (err) {
      console.error('Failed to calculate multi-meter shortest route', err);
    } finally {
      setIsCalculatingMultiRoute(false);
    }
  };

  const handleStopMultiNavigation = () => {
    setIsMultiNavigating(false);
    setMultiRoute(null);
    setCurrentStopIndex(0);
  };

  const handleSelectStopIndex = (index: number) => {
    if (!multiRoute || !multiRoute.stops[index]) return;
    setCurrentStopIndex(index);
    const stop = multiRoute.stops[index];
    const found = allCustomers.find((c) => c.customer_id === stop.customer_id);
    if (found) setSelectedCustomer(found);
  };

  // Payment Collection Success Callback
  const handlePaymentSuccess = (record: PaymentRecord) => {
    setIsPaymentModalOpen(false);
    setCompletedPayment(record);

    if (isMultiNavigating && multiRoute) {
      if (currentStopIndex < multiRoute.stops.length - 1) {
        handleSelectStopIndex(currentStopIndex + 1);
      } else {
        handleStopMultiNavigation();
      }
    } else {
      stopNavigation();
    }

    // Clear cache and refresh customers to update marker colors instantly
    customerService.clearCache();
    loadCustomers();
  };

  const currentNavStepInstruction = useMemo(() => {
    if (!activeRoute || !activeRoute.steps || activeRoute.steps.length <= currentStepIndex) {
      return undefined;
    }
    return activeRoute.steps[currentStepIndex].instruction;
  }, [activeRoute, currentStepIndex]);

  const navStateObj = useMemo(() => {
    if (!isNavigating || !navTargetCustomer) return undefined;
    return {
      active: true,
      destination: { lat: navTargetCustomer.latitude, lng: navTargetCustomer.longitude },
      targetCustomer: navTargetCustomer,
      distanceMeters: activeRoute?.distance_meters || distanceMeters || 0,
      durationSeconds: activeRoute?.duration_seconds || durationSeconds || 0,
      distanceText: activeRoute?.distance_text || 'Nearby',
      durationText: activeRoute?.duration_text || 'Calculating...',
      currentStepIndex,
      currentStepInstruction: currentNavStepInstruction || `Navigate to meter at ${navTargetCustomer.address}`,
      isOffRoute,
      isFollowing,
    };
  }, [
    isNavigating,
    navTargetCustomer,
    activeRoute,
    distanceMeters,
    durationSeconds,
    currentStepIndex,
    currentNavStepInstruction,
    isOffRoute,
    isFollowing,
  ]);

  const handleSelectMapCustomer = React.useCallback(
    (c: Customer) => {
      setSelectedCustomer(c);
      if (isMultiNavigating && multiRoute) {
        const stopIdx = multiRoute.stops.findIndex((s) => s.customer_id === c.customer_id);
        if (stopIdx !== -1) setCurrentStopIndex(stopIdx);
      }
    },
    [isMultiNavigating, multiRoute]
  );

  const handleOpenCustomerStreetView = React.useCallback(
    (c: Customer) => {
      openStreetView(c.latitude, c.longitude, c.name, c.address);
    },
    [openStreetView]
  );

  const handleCollectPaymentModalOpen = React.useCallback(() => {
    setIsPaymentModalOpen(true);
  }, []);



  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Offline Sync Banner */}
      <div className="z-40">
        <OfflineSyncBanner />
      </div>

      {/* Top Map Search & Filter Bar */}
      {!isNavigating && (
        <div className="absolute top-4 left-4 right-4 z-30 max-w-xl mx-auto">
          <MapFilters
            filters={filters}
            onFilterChange={setFilters}
            customerCounts={counts}
            onNavigateAll={handleStartMultiNavigation}
            isCalculatingMultiRoute={isCalculatingMultiRoute}
            filteredCount={filteredCustomers.length}
          />
        </div>
      )}

      {/* Main Interactive Map Canvas */}
      <div className="w-full h-full">
        <MapView
          customers={filteredCustomers}
          officerCoords={officerCoords}
          officerHeading={officerHeading}
          selectedCustomer={selectedCustomer}
          route={activeRoute}
          multiRoute={isMultiNavigating ? multiRoute : null}
          activeStopIndex={currentStopIndex}
          navState={navStateObj}
          streetView={streetView}
          onSelectCustomer={handleSelectMapCustomer}
          onExitNavigation={stopNavigation}
          onCollectPayment={handleCollectPaymentModalOpen}
          onOpenStreetView={handleOpenCustomerStreetView}
          onCloseStreetView={closeStreetView}
          onToggleFollow={toggleFollow}
        />
      </div>

      {/* Multi-Stop Shortest Path Navigation Display */}
      {isMultiNavigating && multiRoute && (
        <MultiRouteDisplay
          multiRoute={multiRoute}
          currentStopIndex={currentStopIndex}
          allCustomers={allCustomers}
          onSelectStopIndex={handleSelectStopIndex}
          onStopNavigation={handleStopMultiNavigation}
          onCollectPaymentForStop={(cust) => {
            setSelectedCustomer(cust);
            setIsPaymentModalOpen(true);
          }}
        />
      )}

      {/* Selected Customer Bottom Card (shown when pin clicked and not navigating) */}
      {!isNavigating && !isMultiNavigating && selectedCustomer && (
        <CustomerBottomSheet
          customer={selectedCustomer}
          officerCoords={officerCoords}
          distanceMeters={distanceMeters}
          durationSeconds={durationSeconds}
          onClose={() => setSelectedCustomer(null)}
          onNavigate={handleStartSingleNavigation}
          onCollectPayment={() => setIsPaymentModalOpen(true)}
          onViewStreetView={(c) => openStreetView(c.latitude, c.longitude, c.name, c.address)}
        />
      )}

      {/* Payment Collection Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        customer={selectedCustomer || navTargetCustomer}
        officerCoords={officerCoords}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Digital Receipt View Modal */}
      <ReceiptView
        isOpen={!!completedPayment}
        paymentRecord={completedPayment}
        onClose={() => setCompletedPayment(null)}
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      }
    >
      <MapPageContent />
    </React.Suspense>
  );
}
