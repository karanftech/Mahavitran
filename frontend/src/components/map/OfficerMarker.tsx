'use client';

import { Coordinates } from '@/types';

export const createOfficerMarkerIcon = (google: any, heading: number | null = 0) => {
  const rotationAngle = heading !== null && !isNaN(heading) ? heading : 0;

  const svgContent = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0284c7" fill-opacity="0.25" />
      <path d="M24 6L32 38L24 30L16 38L24 6Z" fill="#0284c7" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgContent),
    scaledSize: new google.maps.Size(48, 48),
    anchor: new google.maps.Point(24, 24),
    rotation: rotationAngle,
  };
};
