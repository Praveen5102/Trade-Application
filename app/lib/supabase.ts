import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oylsiucrjuqszyelwktd.supabase.co"; // Replace with your Supabase URL
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bHNpdWNyanVxc3p5ZWx3a3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTA3NjIsImV4cCI6MjA3NDUyNjc2Mn0.gCs_xHCXXPHLiNpoXG9mMMUX7OXE3lYWLsWXdPDkR2s"; // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
export default supabase;
