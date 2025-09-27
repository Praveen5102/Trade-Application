// supabaseClient.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

// Replace with your actual Supabase credentials
const SUPABASE_URL = "https://oylsiucrjuqszyelwktd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bHNpdWNyanVxc3p5ZWx3a3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTA3NjIsImV4cCI6MjA3NDUyNjc2Mn0.gCs_xHCXXPHLiNpoXG9mMMUX7OXE3lYWLsWXdPDkR2s";

export const supabase = createClient(
  "https://oylsiucrjuqszyelwktd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bHNpdWNyanVxc3p5ZWx3a3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTA3NjIsImV4cCI6MjA3NDUyNjc2Mn0.gCs_xHCXXPHLiNpoXG9mMMUX7OXE3lYWLsWXdPDkR2s",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
