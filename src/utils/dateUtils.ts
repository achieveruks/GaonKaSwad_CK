/**
 * Utilities for parsing and formatting delivery timestamps & scheduled slots
 */

/**
 * Computes a standardized ISO 8601 Timestamp (TIMESTAMPTZ compatible)
 * from a date string (YYYY-MM-DD or readable) and a time slot range (e.g. "8:00 PM – 9:00 PM").
 */
export function computeScheduledIsoTimestamp(
  dateInput?: string,
  timeRange?: string
): string | null {
  if (!dateInput) return null;

  // If already a valid full ISO 8601 string with timestamp
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateInput)) {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  let hours = 12;
  let minutes = 0;

  if (timeRange) {
    // Extract starting time (e.g. "8:00 PM" from "8:00 PM – 9:00 PM")
    const startTimeStr = timeRange.split('–')[0].split('-')[0].trim();
    const match = startTimeStr.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = (match[3] || '').toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }
  }

  // Check if dateInput is in YYYY-MM-DD format
  const ymdMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const scheduledDate = new Date(year, month, day, hours, minutes, 0, 0);
    return !isNaN(scheduledDate.getTime()) ? scheduledDate.toISOString() : null;
  }

  // Check if dateInput is readable formatted (e.g., "Sat, 29 Aug" or "29 Aug 2026")
  const parsed = new Date(dateInput);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(hours, minutes, 0, 0);
    return parsed.toISOString();
  }

  // Fallback: If year is missing (e.g. "Sat, 29 Aug"), append current year
  const currentYear = new Date().getFullYear();
  const parsedWithYear = new Date(`${dateInput} ${currentYear}`);
  if (!isNaN(parsedWithYear.getTime())) {
    parsedWithYear.setHours(hours, minutes, 0, 0);
    return parsedWithYear.toISOString();
  }

  return null;
}

/**
 * Formats an ISO timestamp or date string into a clean, human-readable scheduled delivery label.
 */
export function formatScheduledShortDate(
  scheduledAt?: string | null,
  scheduledDate?: string | null,
  fallbackLabel?: string | null
): string {
  // Try ISO timestamp or standard date string first
  if (scheduledAt) {
    try {
      const date = new Date(scheduledAt);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
    } catch {
      // ignore
    }
  }

  // Try scheduledDate (e.g., "Mon, 7 Sep" or "7 Sep 2026" or "2026-09-07")
  if (scheduledDate) {
    const cleanDate = scheduledDate.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*/i, '').trim();
    if (cleanDate) {
      // If it has year, strip year if needed or return day + month
      const parts = cleanDate.split(' ');
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[1]}`;
      }
      return cleanDate;
    }
  }

  // Try extracting from fallback label (e.g., "... on Mon, 7 Sep")
  if (fallbackLabel) {
    const onMatch = fallbackLabel.match(/on\s+([A-Za-z]+,\s*)?(\d{1,2}\s+[A-Za-z]+)/i);
    if (onMatch && onMatch[2]) {
      return onMatch[2].trim();
    }
  }

  return 'Scheduled';
}

/**
 * Formats an ISO timestamp or date string into a clean, human-readable scheduled delivery label.
 */
export function formatScheduledAt(
  scheduledAt?: string | null,
  fallbackLabel?: string
): string {
  if (fallbackLabel && fallbackLabel.trim()) return fallbackLabel.trim();
  if (!scheduledAt) return 'Scheduled Slot';

  try {
    const date = new Date(scheduledAt);
    if (!isNaN(date.getTime())) {
      // E.g. "Sat, 29 Aug at 08:00 PM"
      const dateFormatted = date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const timeFormatted = date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateFormatted} (${timeFormatted})`;
    }
  } catch {
    // If not a valid timestamp, return string as-is
  }

  return scheduledAt;
}

/**
 * Extract a numeric millisecond timestamp for an order's received / placed date.
 * Prioritizes placedAt, createdAt, or fallback ISO strings.
 */
export function getOrderReceivedTimestamp(order: any): number {
  if (!order) return 0;
  const rawDate =
    order.placedAt ||
    order.createdAt ||
    order.placed_at ||
    order.created_at ||
    order.receivedAt ||
    order.received_at;
  if (!rawDate) return 0;
  const parsed = new Date(rawDate).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export type OrderDateFilterType =
  | 'all'
  | 'custom_date'
  | 'this_week'
  | 'this_month'
  | 'date_range';

/**
 * Checks if an order's received date matches the specified date filter.
 */
export function isOrderMatchingDateFilter(
  order: any,
  filter: OrderDateFilterType,
  customDateStr?: string,
  rangeStartDateStr?: string,
  rangeEndDateStr?: string
): boolean {
  if (filter === 'all') return true;
  const ts = getOrderReceivedTimestamp(order);
  if (!ts) return false;

  const orderDate = new Date(ts);
  const now = new Date();

  // Helper for YYYY-MM-DD format based on local time
  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const orderKey = toDateKey(orderDate);

  if (filter === 'custom_date' && customDateStr) {
    return orderKey === customDateStr;
  }

  if (filter === 'this_week') {
    // Current week from Monday to Sunday
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(monday);
    endOfWeek.setDate(monday.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    return ts >= monday.getTime() && ts <= endOfWeek.getTime();
  }

  if (filter === 'this_month') {
    return (
      orderDate.getFullYear() === now.getFullYear() &&
      orderDate.getMonth() === now.getMonth()
    );
  }

  if (filter === 'date_range') {
    if (rangeStartDateStr && rangeEndDateStr) {
      return orderKey >= rangeStartDateStr && orderKey <= rangeEndDateStr;
    }
    if (rangeStartDateStr) {
      return orderKey >= rangeStartDateStr;
    }
    if (rangeEndDateStr) {
      return orderKey <= rangeEndDateStr;
    }
  }

  return true;
}
