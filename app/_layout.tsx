import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../supabaseClient";
import { useAuthContext } from "./hooks/use-auth-context";
import AuthProvider from "./providers/auth-provider";
// Separate RootNavigator so we can access the AuthContext
function RootNavigator() {
  const { isLoggedIn } = useAuthContext();
  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
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
      <AuthProvider>
        <RootNavigator />
        {isLoggedIn ? (
          <Stack.Screen name="(tabs)" /> // Logged in
        ) : (
          <Stack.Screen name="(auth)" /> // Not logged in
        )}
      </AuthProvider>
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
