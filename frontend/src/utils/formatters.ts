export function formatCurrency(amount?: number | null): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDistance(meters?: number | null): string {
  if (meters === undefined || meters === null || isNaN(meters)) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '0 mins';
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min${mins === 1 ? '' : 's'}`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} hr ${remMins} min`;
}
