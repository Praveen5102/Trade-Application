// app/index.tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../supabaseClient";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        router.replace("/(tabs)/Dashboard"); // ✅ If logged in → go dashboard
      } else {
        router.replace("/(auth)/signin"); // ✅ If not logged in → go signin
      }
    };

    checkUser();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1A1A2E",
      }}
    >
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );
}
