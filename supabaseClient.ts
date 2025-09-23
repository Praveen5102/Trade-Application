// supabaseClient.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Replace with your actual Supabase credentials
const SUPABASE_URL = "https://rvvcjaheldcyrlcbmwpm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2dmNqYWhlbGRjeXJsY2Jtd3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDM1NTgsImV4cCI6MjA3NDE3OTU1OH0.iUg557ol8fCeHYhPbtn6ZbCu82yXLnF6SfpUJnpYraE";

export const supabase = createClient(
  "https://rvvcjaheldcyrlcbmwpm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2dmNqYWhlbGRjeXJsY2Jtd3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDM1NTgsImV4cCI6MjA3NDE3OTU1OH0.iUg557ol8fCeHYhPbtn6ZbCu82yXLnF6SfpUJnpYraE",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
