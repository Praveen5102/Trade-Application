// supabaseClient.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

// Replace with your actual Supabase credentials
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://oylsiucrjuqszyelwktd.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bHNpdWNyanVxc3p5ZWx3a3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTA3NjIsImV4cCI6MjA3NDUyNjc2Mn0.gCs_xHCXXPHLiNpoXG9mMMUX7OXE3lYWLsWXdPDkR2s";

// Adapter for SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => getItemAsync(key),
  setItem: (key: string, value: string) => {
    if (value.length > 2048) {
      console.warn(
        "Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully."
      );
    }
    return setItemAsync(key, value);
  },
  removeItem: (key: string) => deleteItemAsync(key),
};

// Choose storage dynamically: Expo SecureStore if available, otherwise AsyncStorage
const storage = ExpoSecureStoreAdapter || AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
export default function SupabaseDummy() {
  return null;
}
