import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const PRAYER_CALC_METHOD_KEY = 'PRAYER_CALC_METHOD';
const PRAYER_METHODS_CACHE_KEY = 'PRAYER_CALC_METHODS_CACHE';
export const PRAYER_TIMEZONE_KEY = 'PRAYER_TIMEZONE';

// Fallback list of methods (keys must match PrayTime.methods)
export const PRAYER_CALC_METHODS = [
  { id: 'MWL', label: 'Muslim World League (MWL)' },
  { id: 'ISNA', label: 'Islamic Society of North America (ISNA)' },
  { id: 'Egypt', label: 'Egyptian General Authority of Survey' },
  { id: 'Makkah', label: 'Umm al-Qura, Makkah' },
  { id: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
  { id: 'Tehran', label: 'Institute of Geophysics, University of Tehran' },
  { id: 'Jafari', label: 'Shia Ithna-Ashari, Leva Research Institute, Qum' },
];

// App-wide default calculation method (should be MWL by request)
export const DEFAULT_PRAYER_CALC_METHOD = 'MWL';

export async function getCalculationMethod() {
  try {
    const stored = await AsyncStorage.getItem(PRAYER_CALC_METHOD_KEY);
    if (stored) {
      return stored;
    }
  } catch (e) {
    console.error('Error reading prayer calc method:', e);
  }
  // If nothing stored yet, use the app's default (MWL)
  return DEFAULT_PRAYER_CALC_METHOD;
}

export async function setCalculationMethod(methodId) {
  try {
    await AsyncStorage.setItem(PRAYER_CALC_METHOD_KEY, methodId);
  } catch (e) {
    console.error('Error saving prayer calc method:', e);
  }
}

export async function getCalculationMethods() {
  // Try remote API first
  try {
    const resp = await axios.get('https://api.tashkeel.lk/v1/prayertimes/methods');
    if (resp.data?.ok && Array.isArray(resp.data.methods)) {
      const fromApi = resp.data.methods.map((m) => ({
        id: m.code,
        label: m.name,
      }));

      // Cache for offline use
      try {
        await AsyncStorage.setItem(PRAYER_METHODS_CACHE_KEY, JSON.stringify(fromApi));
      } catch (cacheErr) {
        console.error('Error caching prayer calc methods:', cacheErr?.message || cacheErr);
      }

      return fromApi;
    }
  } catch (e) {
    console.error('Error fetching prayer calc methods from API:', e?.message || e);
  }

  // Fallback to cached methods if available
  try {
    const cached = await AsyncStorage.getItem(PRAYER_METHODS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading cached prayer calc methods:', e?.message || e);
  }

  // Final fallback: hard-coded list
  return PRAYER_CALC_METHODS;
}

// Common timezones list (IANA identifiers)
export const COMMON_TIMEZONES = [
  // UTC / GMT
  { id: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { id: 'Etc/UTC', label: 'Etc/UTC' },
  { id: 'Etc/GMT', label: 'Etc/GMT' },
  { id: 'Etc/GMT+1', label: 'Etc/GMT+1 (UTC−1)' },
  { id: 'Etc/GMT-1', label: 'Etc/GMT-1 (UTC+1)' },
  
  // Europe
  { id: 'Europe/London', label: 'Europe/London (UK)' },
  { id: 'Europe/Dublin', label: 'Europe/Dublin' },
  { id: 'Europe/Paris', label: 'Europe/Paris' },
  { id: 'Europe/Berlin', label: 'Europe/Berlin' },
  { id: 'Europe/Rome', label: 'Europe/Rome' },
  { id: 'Europe/Madrid', label: 'Europe/Madrid' },
  { id: 'Europe/Amsterdam', label: 'Europe/Amsterdam' },
  { id: 'Europe/Brussels', label: 'Europe/Brussels' },
  { id: 'Europe/Zurich', label: 'Europe/Zurich' },
  { id: 'Europe/Vienna', label: 'Europe/Vienna' },
  { id: 'Europe/Stockholm', label: 'Europe/Stockholm' },
  { id: 'Europe/Oslo', label: 'Europe/Oslo' },
  { id: 'Europe/Copenhagen', label: 'Europe/Copenhagen' },
  { id: 'Europe/Warsaw', label: 'Europe/Warsaw' },
  { id: 'Europe/Prague', label: 'Europe/Prague' },
  { id: 'Europe/Budapest', label: 'Europe/Budapest' },
  { id: 'Europe/Athens', label: 'Europe/Athens' },
  { id: 'Europe/Helsinki', label: 'Europe/Helsinki' },
  { id: 'Europe/Istanbul', label: 'Europe/Istanbul' },
  { id: 'Europe/Moscow', label: 'Europe/Moscow' },
  { id: 'Europe/Kyiv', label: 'Europe/Kyiv' },
  
  // Africa
  { id: 'Africa/Cairo', label: 'Africa/Cairo' },
  { id: 'Africa/Johannesburg', label: 'Africa/Johannesburg' },
  { id: 'Africa/Lagos', label: 'Africa/Lagos' },
  { id: 'Africa/Nairobi', label: 'Africa/Nairobi' },
  { id: 'Africa/Casablanca', label: 'Africa/Casablanca' },
  { id: 'Africa/Algiers', label: 'Africa/Algiers' },
  { id: 'Africa/Tunis', label: 'Africa/Tunis' },
  { id: 'Africa/Tripoli', label: 'Africa/Tripoli' },
  { id: 'Africa/Addis_Ababa', label: 'Africa/Addis_Ababa' },
  { id: 'Africa/Dar_es_Salaam', label: 'Africa/Dar_es_Salaam' },
  
  // Middle East
  { id: 'Asia/Riyadh', label: 'Asia/Riyadh' },
  { id: 'Asia/Dubai', label: 'Asia/Dubai' },
  { id: 'Asia/Abu_Dhabi', label: 'Asia/Abu_Dhabi' },
  { id: 'Asia/Kuwait', label: 'Asia/Kuwait' },
  { id: 'Asia/Qatar', label: 'Asia/Qatar' },
  { id: 'Asia/Bahrain', label: 'Asia/Bahrain' },
  { id: 'Asia/Jerusalem', label: 'Asia/Jerusalem' },
  { id: 'Asia/Amman', label: 'Asia/Amman' },
  { id: 'Asia/Baghdad', label: 'Asia/Baghdad' },
  { id: 'Asia/Tehran', label: 'Asia/Tehran' },
  
  // South Asia
  { id: 'Asia/Colombo', label: 'Asia/Colombo 🇱🇰' },
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata 🇮🇳' },
  { id: 'Asia/Kathmandu', label: 'Asia/Kathmandu' },
  { id: 'Asia/Dhaka', label: 'Asia/Dhaka' },
  { id: 'Asia/Karachi', label: 'Asia/Karachi' },
  { id: 'Asia/Thimphu', label: 'Asia/Thimphu' },
  
  // Southeast Asia
  { id: 'Asia/Singapore', label: 'Asia/Singapore' },
  { id: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur' },
  { id: 'Asia/Bangkok', label: 'Asia/Bangkok' },
  { id: 'Asia/Jakarta', label: 'Asia/Jakarta' },
  { id: 'Asia/Manila', label: 'Asia/Manila' },
  { id: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh' },
  { id: 'Asia/Phnom_Penh', label: 'Asia/Phnom_Penh' },
  { id: 'Asia/Vientiane', label: 'Asia/Vientiane' },
  { id: 'Asia/Yangon', label: 'Asia/Yangon' },
  
  // East Asia
  { id: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { id: 'Asia/Seoul', label: 'Asia/Seoul' },
  { id: 'Asia/Shanghai', label: 'Asia/Shanghai' },
  { id: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong' },
  { id: 'Asia/Taipei', label: 'Asia/Taipei' },
  { id: 'Asia/Macau', label: 'Asia/Macau' },
  { id: 'Asia/Ulaanbaatar', label: 'Asia/Ulaanbaatar' },
  
  // North America
  { id: 'America/New_York', label: 'America/New_York (Eastern)' },
  { id: 'America/Chicago', label: 'America/Chicago (Central)' },
  { id: 'America/Denver', label: 'America/Denver (Mountain)' },
  { id: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific)' },
  { id: 'America/Phoenix', label: 'America/Phoenix (no DST)' },
  { id: 'America/Anchorage', label: 'America/Anchorage' },
  { id: 'America/Adak', label: 'America/Adak' },
  { id: 'America/Toronto', label: 'America/Toronto' },
  { id: 'America/Vancouver', label: 'America/Vancouver' },
  { id: 'America/Mexico_City', label: 'America/Mexico_City' },
  
  // Central America & Caribbean
  { id: 'America/Guatemala', label: 'America/Guatemala' },
  { id: 'America/Costa_Rica', label: 'America/Costa_Rica' },
  { id: 'America/Panama', label: 'America/Panama' },
  { id: 'America/Havana', label: 'America/Havana' },
  { id: 'America/Jamaica', label: 'America/Jamaica' },
  { id: 'America/Puerto_Rico', label: 'America/Puerto_Rico' },
  
  // South America
  { id: 'America/Sao_Paulo', label: 'America/Sao_Paulo' },
  { id: 'America/Buenos_Aires', label: 'America/Buenos_Aires' },
  { id: 'America/Santiago', label: 'America/Santiago' },
  { id: 'America/Bogota', label: 'America/Bogota' },
  { id: 'America/Lima', label: 'America/Lima' },
  { id: 'America/Caracas', label: 'America/Caracas' },
  { id: 'America/Montevideo', label: 'America/Montevideo' },
  { id: 'America/Asuncion', label: 'America/Asuncion' },
  
  // Australia & Oceania
  { id: 'Australia/Sydney', label: 'Australia/Sydney' },
  { id: 'Australia/Melbourne', label: 'Australia/Melbourne' },
  { id: 'Australia/Brisbane', label: 'Australia/Brisbane' },
  { id: 'Australia/Perth', label: 'Australia/Perth' },
  { id: 'Australia/Adelaide', label: 'Australia/Adelaide' },
  { id: 'Pacific/Auckland', label: 'Pacific/Auckland' },
  { id: 'Pacific/Fiji', label: 'Pacific/Fiji' },
  { id: 'Pacific/Guam', label: 'Pacific/Guam' },
  { id: 'Pacific/Tahiti', label: 'Pacific/Tahiti' },
  { id: 'Pacific/Honolulu', label: 'Pacific/Honolulu' },
];

export async function getTimezone() {
  try {
    const stored = await AsyncStorage.getItem(PRAYER_TIMEZONE_KEY);
    if (stored) {
      return stored;
    }
  } catch (e) {
    console.error('Error reading prayer timezone:', e);
  }
  // If nothing stored, use device timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export async function setTimezone(timezoneId) {
  try {
    await AsyncStorage.setItem(PRAYER_TIMEZONE_KEY, timezoneId);
  } catch (e) {
    console.error('Error saving prayer timezone:', e);
  }
}


