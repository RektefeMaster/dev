// Google Maps API Key
// Bu key'i Google Cloud Console'dan alabilirsiniz
// https://console.cloud.google.com/

export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

// API key yoksa OpenStreetMap kullan
export const USE_OPENSTREETMAP = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
