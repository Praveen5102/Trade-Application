import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../supabaseClient";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      <View style={styles.splashContainer}>
        <Text style={styles.title}>Trade Spark</Text>
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
        <Stack.Screen name="(tabs)" /> // Logged in
      ) : (
        <Stack.Screen name="(auth)" /> // Not logged in
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#1A1A2E",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
  },
});
