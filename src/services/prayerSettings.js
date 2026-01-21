import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const PRAYER_CALC_METHOD_KEY = 'PRAYER_CALC_METHOD';
const PRAYER_METHODS_CACHE_KEY = 'PRAYER_CALC_METHODS_CACHE';

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

// Default from API: https://api.tashkeel.lk/v1/prayertimes/methods
export const DEFAULT_PRAYER_CALC_METHOD = 'ISNA';

export async function getCalculationMethod() {
  try {
    const stored = await AsyncStorage.getItem(PRAYER_CALC_METHOD_KEY);
    if (stored) {
      return stored;
    }

    // If nothing stored yet, try to pull default from API once
    try {
      const resp = await axios.get('https://api.tashkeel.lk/v1/prayertimes/methods');
      const apiDefault = resp.data?.default?.code;
      if (apiDefault && typeof apiDefault === 'string') {
        await AsyncStorage.setItem(PRAYER_CALC_METHOD_KEY, apiDefault);
        return apiDefault;
      }
    } catch (apiError) {
      console.error('Error fetching default prayer calc method from API:', apiError?.message || apiError);
    }
  } catch (e) {
    console.error('Error reading prayer calc method:', e);
  }
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


