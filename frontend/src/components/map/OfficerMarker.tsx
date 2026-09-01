'use client';

export const createOfficerMarkerIcon = (google: any, heading: number | null = 0) => {
  const rotationAngle = heading !== null && !isNaN(heading) ? heading : 0;

  // Embedding SVG transform rotate directly inside the SVG markup allows SVG data URLs
  // to rotate to match the officer's live compass direction / travel heading in Google Maps.
  const svgContent = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0284c7" fill-opacity="0.2" />
      <circle cx="24" cy="24" r="18" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3 3" />
      <g transform="rotate(${rotationAngle}, 24, 24)">
        <path d="M24 5L33 37L24 29L15 37L24 5Z" fill="#0284c7" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="24" cy="24" r="4.5" fill="#FFFFFF" />
      </g>
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgContent),
    scaledSize: new google.maps.Size(48, 48),
    anchor: new google.maps.Point(24, 24),
  };
};
