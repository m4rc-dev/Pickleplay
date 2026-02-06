// Supabase Configuration for PicklePlay Mobile App
// These values are safe to expose in the client - they only allow authenticated access

export const SUPABASE_URL = 'https://hdruhslfadbaadtgvetf.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcnVoc2xmYWRiYWFkdGd2ZXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTEwMTUsImV4cCI6MjA4NTUyNzAxNX0.qmN6_w4J9Y6Jof6RVrEHq3cW8-EE8Bietq8_U4OVehM';

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = 'AIzaSyDpAWwwpxilvwrDvVeXZm9OImBEXKe0YJo';

// Google OAuth Configuration
// To get these, go to: https://console.cloud.google.com/apis/credentials
// Create OAuth 2.0 Client IDs for:
// 1. Android: Use your app's package name (com.pickleplay.ph) and SHA-1 fingerprint
// 2. iOS: Use your app's bundle identifier (com.pickleplay.ph)
// 3. Web: For Expo development
export const GOOGLE_WEB_CLIENT_ID = '208609136535-ssjkktis9g3n8f11hs46uuf6n2riecen.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = ''; // Add your Google Android Client ID here  
export const GOOGLE_IOS_CLIENT_ID = ''; // Add your Google iOS Client ID here
