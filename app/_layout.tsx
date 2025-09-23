import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../supabaseClient";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setIsLoggedIn(!!session);
        }
      );

      return () => listener.subscription.unsubscribe();
    };

    checkSession();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1A1A2E",
        }}
      >
        <Text style={{ fontSize: 32, fontWeight: "bold", color: "#FFD700" }}>
          Trade Spark
        </Text>
        <ActivityIndicator
          size="large"
          color="#FFD700"
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="(tabs)" /> // ✅ Redirect to Tabs layout
      ) : (
        <Stack.Screen name="(auth)" /> // ✅ Redirect to Auth stack
      )}
    </Stack>
  );
}
