/**
 * PIN Code Lookup and Auto-fill Service
 * Resolves 6-digit Indian PIN codes to City, State, District, and Area
 */

export interface PincodeDetails {
  pincode: string;
  city: string;
  state: string;
  district?: string;
  area?: string;
  found: boolean;
}

// In-memory cache for ultra-fast repeated lookups
const pincodeCache = new Map<string, PincodeDetails>();

// Curated dictionary of known operational & major PIN codes across active regions
const KNOWN_PIN_RANGES: Record<string, { city: string; state: string; district?: string }> = {
  // Bhubaneswar (Khordha, Odisha)
  '751001': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751002': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751003': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751004': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751006': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751007': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751008': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751009': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751010': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751011': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751012': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751013': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751014': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751015': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751016': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751017': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751018': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751019': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751020': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751021': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751022': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751023': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751024': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751025': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751028': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751030': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '751031': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },
  '752054': { city: 'Bhubaneswar', state: 'Odisha', district: 'Khorda' },

  // Cuttack
  '753001': { city: 'Cuttack', state: 'Odisha', district: 'Cuttack' },
  '753002': { city: 'Cuttack', state: 'Odisha', district: 'Cuttack' },
  '753003': { city: 'Cuttack', state: 'Odisha', district: 'Cuttack' },

  // Bangalore / Bengaluru (Karnataka)
  '560001': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560008': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560034': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560037': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560038': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560048': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560066': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560067': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560068': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560075': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560087': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560102': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
  '560103': { city: 'Bangalore', state: 'Karnataka', district: 'Bangalore' },
};

/**
 * Heuristic prefix map for general Indian PIN ranges when postal API is slow or unreachable
 */
function inferFromPrefix(pin: string): { city: string; state: string } | null {
  if (/^751\d{3}$/.test(pin)) return { city: 'Bhubaneswar', state: 'Odisha' };
  if (/^752\d{3}$/.test(pin)) return { city: 'Puri / Khorda', state: 'Odisha' };
  if (/^753\d{3}$/.test(pin)) return { city: 'Cuttack', state: 'Odisha' };
  if (/^75[4-9]\d{3}$/.test(pin) || /^76\d{4}$/.test(pin) || /^77\d{4}$/.test(pin)) {
    return { city: 'Odisha', state: 'Odisha' };
  }
  if (/^560\d{3}$/.test(pin)) return { city: 'Bangalore', state: 'Karnataka' };
  if (/^56[1-9]\d{3}$/.test(pin) || /^57\d{4}$/.test(pin) || /^58\d{4}$/.test(pin) || /^59\d{4}$/.test(pin)) {
    return { city: 'Karnataka', state: 'Karnataka' };
  }
  if (/^110\d{3}$/.test(pin)) return { city: 'New Delhi', state: 'Delhi' };
  if (/^400\d{3}$/.test(pin)) return { city: 'Mumbai', state: 'Maharashtra' };
  if (/^700\d{3}$/.test(pin)) return { city: 'Kolkata', state: 'West Bengal' };
  if (/^600\d{3}$/.test(pin)) return { city: 'Chennai', state: 'Tamil Nadu' };
  if (/^500\d{3}$/.test(pin)) return { city: 'Hyderabad', state: 'Telangana' };
  return null;
}

/**
 * Lookup PIN code information
 */
export async function lookupPincode(rawPin: string): Promise<PincodeDetails | null> {
  const pin = (rawPin || '').replace(/\D/g, '').slice(0, 6);
  if (pin.length !== 6) return null;

  // 1. Check in-memory cache
  if (pincodeCache.has(pin)) {
    return pincodeCache.get(pin)!;
  }

  // 2. Check local curated fast map
  if (KNOWN_PIN_RANGES[pin]) {
    const known = KNOWN_PIN_RANGES[pin];
    const details: PincodeDetails = {
      pincode: pin,
      city: known.city,
      state: known.state,
      district: known.district,
      found: true,
    };
    pincodeCache.set(pin, details);
    return details;
  }

  // 3. Try our backend API endpoint proxy
  try {
    const res = await fetch(`/api/pincode/lookup?pin=${encodeURIComponent(pin)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.details) {
        pincodeCache.set(pin, data.details);
        return data.details;
      }
    }
  } catch (apiErr) {
    console.warn('Backend pincode lookup error:', apiErr);
  }

  // 4. Try Direct India Post API
  try {
    const postRes = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
    if (postRes.ok) {
      const postData = await postRes.json();
      if (Array.isArray(postData) && postData[0]?.Status === 'Success' && Array.isArray(postData[0]?.PostOffice) && postData[0].PostOffice.length > 0) {
        const po = postData[0].PostOffice[0];
        let city = po.District || po.Division || po.Block || po.Circle || '';
        // Normalize common metro city names
        if (city.toLowerCase().includes('bangalore') || city.toLowerCase().includes('bengaluru')) {
          city = 'Bangalore';
        } else if (city.toLowerCase().includes('khorda') || city.toLowerCase().includes('bhubaneswar')) {
          city = 'Bhubaneswar';
        }

        const details: PincodeDetails = {
          pincode: pin,
          city: city || po.State,
          state: po.State,
          district: po.District,
          area: po.Name,
          found: true,
        };
        pincodeCache.set(pin, details);
        return details;
      }
    }
  } catch (postErr) {
    console.warn('India Post API error:', postErr);
  }

  // 5. Fallback to prefix inference
  const inferred = inferFromPrefix(pin);
  if (inferred) {
    const details: PincodeDetails = {
      pincode: pin,
      city: inferred.city,
      state: inferred.state,
      found: true,
    };
    pincodeCache.set(pin, details);
    return details;
  }

  return null;
}
