/* FirstStep — geolocation + venue search.
   Local, radius-bounded search uses Overpass (OpenStreetMap POIs).
   Global fallback / no-location search uses Photon (free, no key).
   Both are free/open, no API key, no paid service. */

import { similarity } from './fuzzy.js?v=3.0.1';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_ENDPOINT = 'https://photon.komoot.io/reverse';

export const RADIUS_NEAR = 500;
export const RADIUS_WIDE = 3000;

const MIN_SIMILARITY = 0.32;

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getPosition(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('no-geolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

function buildOverpassQuery(lat, lon, radius) {
  const around = `around:${radius},${lat},${lon}`;
  const keys = ['amenity', 'shop', 'leisure', 'tourism', 'office', 'aeroway', 'railway', 'natural', 'place'];
  const clauses = keys.map((key) => `nwr(${around})["name"]["${key}"];`);
  return `[out:json][timeout:18];(${clauses.join('')});out center 150;`;
}

const OVERPASS_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function addressFromTags(tags) {
  if (!tags) return '';
  const parts = [];
  const houseNum = tags['addr:housenumber'];
  const street = tags['addr:street'];
  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'];
  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'];
  if (street) parts.push(houseNum ? `${street} ${houseNum}` : street);
  if (suburb) parts.push(suburb);
  if (city) parts.push(city);
  return parts.join(', ');
}

function overpassElementToVenue(el, origin) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const tags = el.tags || {};
  const name = tags.name;
  if (!name) return null;
  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    lat,
    lon,
    tags,
    address: addressFromTags(tags),
    distance: origin ? haversine(origin.lat, origin.lon, lat, lon) : null,
    source: 'OpenStreetMap',
  };
}

async function fetchOverpass(query) {
  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
        OVERPASS_TIMEOUT_MS
      );
      if (!res.ok) throw new Error(`overpass-http-${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('overpass-failed');
}

/**
 * Search venues within a radius of the given position.
 * If queryText is empty, returns all named venues sorted by distance (nearby listing).
 * If queryText is non-empty, filters by fuzzy name similarity and sorts by
 * distance first, then similarity, then nothing else (confidence applied by caller).
 */
export async function searchNearby(position, radius, queryText) {
  const query = buildOverpassQuery(position.lat, position.lon, radius);
  const data = await fetchOverpass(query);
  const elements = Array.isArray(data.elements) ? data.elements : [];
  let venues = elements
    .map((el) => overpassElementToVenue(el, position))
    .filter(Boolean);

  // de-duplicate by name+rounded coordinate (ways/nodes for same POI)
  const seen = new Map();
  for (const v of venues) {
    const key = `${v.name.toLowerCase()}-${v.lat.toFixed(4)}-${v.lon.toFixed(4)}`;
    if (!seen.has(key)) seen.set(key, v);
  }
  venues = Array.from(seen.values());

  const trimmed = (queryText || '').trim();
  if (trimmed.length >= 2) {
    venues = venues
      .map((v) => ({ ...v, similarity: similarity(trimmed, v.name) }))
      .filter((v) => v.similarity >= MIN_SIMILARITY)
      .sort((a, b) => a.distance - b.distance || b.similarity - a.similarity);
  } else {
    venues.sort((a, b) => a.distance - b.distance);
  }

  return venues;
}

function photonFeatureToVenue(feature, origin) {
  const props = feature.properties || {};
  const [lon, lat] = feature.geometry?.coordinates || [];
  if (lat == null || lon == null) return null;
  const name = props.name;
  if (!name) return null;
  const tags = {};
  if (props.osm_key) tags[props.osm_key] = props.osm_value;
  const addressParts = [props.street, props.district || props.suburb, props.city, props.country].filter(Boolean);
  return {
    id: `photon-${props.osm_type || 'x'}-${props.osm_id || Math.random()}`,
    name,
    lat,
    lon,
    tags,
    address: addressParts.join(', '),
    distance: origin ? haversine(origin.lat, origin.lon, lat, lon) : null,
    source: 'Photon (küresel arama)',
  };
}

/**
 * Global / unbounded search via Photon. Used only when the user explicitly
 * opts in ("Dünya genelinde ara") or when no geolocation is available at all.
 * If a position is known it's used only to bias ranking, never to hard-filter.
 */
export async function searchGlobal(queryText, position) {
  const trimmed = (queryText || '').trim();
  if (trimmed.length < 3) return [];
  const params = new URLSearchParams({ q: trimmed, limit: '15', lang: 'default' });
  if (position) {
    params.set('lat', String(position.lat));
    params.set('lon', String(position.lon));
    params.set('location_bias_scale', '0.9');
  }
  const res = await fetch(`${PHOTON_ENDPOINT}?${params.toString()}`);
  if (!res.ok) throw new Error(`photon-http-${res.status}`);
  const data = await res.json();
  const features = Array.isArray(data.features) ? data.features : [];
  let venues = features.map((f) => photonFeatureToVenue(f, position)).filter(Boolean);
  venues = venues
    .map((v) => ({ ...v, similarity: similarity(trimmed, v.name) }))
    .sort((a, b) => b.similarity - a.similarity || (a.distance ?? Infinity) - (b.distance ?? Infinity));
  return venues;
}

export async function reverseGeocode(lat, lon) {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    const res = await fetch(`${PHOTON_REVERSE_ENDPOINT}?${params.toString()}`);
    if (!res.ok) return '';
    const data = await res.json();
    const props = data.features?.[0]?.properties;
    if (!props) return '';
    return [props.street, props.district || props.suburb, props.city, props.country].filter(Boolean).join(', ');
  } catch {
    return '';
  }
}
