// app/(auth)/GoogleSignin.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { supabase } from "../lib/supabase";

export default function GoogleSignin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [loading, setLoading] = useState(false);
  const [authId, setAuthId] = useState("");

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setAuthId(user.id);
          setEmail(user.email || "");
          // Pre-fill name from Google metadata if available
          setName(
            user.user_metadata?.full_name || user.user_metadata?.name || ""
          );
        } else {
          // No user found, redirect to signin
          Alert.alert("Error", "No user session found. Please sign in again.");
          router.replace("/(auth)/signin");
        }
      } catch (err: any) {
        console.error("Error fetching user:", err);
        Alert.alert("Error", "Failed to load user data.");
        router.replace("/(auth)/signin");
      }
    };

    fetchUserData();
  }, [router]);

  const validateInputs = useCallback(() => {
    if (!name || !phone || !referral) {
      Alert.alert("Error", "All fields are required.");
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      Alert.alert("Error", "Phone number must be exactly 10 digits.");
      return false;
    }
    return true;
  }, [name, phone, referral]);

  const findReferrer = useCallback(async (referralCode: string) => {
    if (!referralCode) return null;

    const normalized = referralCode.trim().toUpperCase();

    // Special test code that doesn't require actual user
    if (normalized === "TEST2024") return null;

    try {
      const { data, error } = await supabase
        .from("referrals")
        .select("user_id")
        .eq("referral_code", normalized)
        .maybeSingle();

      if (error) {
        console.error("Referral lookup error:", error.message);
        return null;
      }

      return data?.user_id || null;
    } catch (err: any) {
      console.error("Referral lookup failed:", err.message);
      return null;
    }
  }, []);

  const handleContinue = useCallback(async () => {
    if (!validateInputs()) return;
    setLoading(true);

    try {
      // Check if phone already exists
      const { data: existingPhone, error: phoneCheckError } = await supabase
        .from("users")
        .select("phone")
        .eq("phone", phone)
        .maybeSingle();

      if (phoneCheckError && phoneCheckError.code !== "PGRST116") {
        throw new Error("Failed to check phone availability.");
      }
      if (existingPhone) {
        Alert.alert("Error", "Phone number already in use.");
        return;
      }

      // Validate referral code
      let referredBy: string | null = null;
      if (referral) {
        referredBy = await findReferrer(referral);
        if (!referredBy && referral.toUpperCase() !== "TEST2024") {
          Alert.alert(
            "Error",
            "Invalid referral code. Please check and try again."
          );
          return;
        }
      }

      // Check if user already exists in users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authId)
        .maybeSingle();

      if (userCheckError && userCheckError.code !== "PGRST116") {
        throw new Error("Failed to check user data.");
      }

      if (existingUser) {
        // User already exists, just update and redirect
        Alert.alert(
          "Info",
          "Your profile already exists. Redirecting to dashboard."
        );
        router.replace("/(tabs)/Dashboard");
        return;
      }

      // Insert user - trigger will handle wallet, profile, referrals, and referral updates
      const { error: insertError } = await supabase.from("users").insert([
        {
          auth_id: authId,
          email: email.toLowerCase(),
          full_name: name.trim(),
          phone,
          referred_by: referredBy, // Will be null for TEST2024 or no referral
        },
      ]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      Alert.alert(
        "Success",
        "Profile completed successfully! Your unique referral code has been generated.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tabs)/Dashboard"),
          },
        ]
      );
    } catch (err: any) {
      console.error("Profile completion error:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to complete profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [
    validateInputs,
    findReferrer,
    authId,
    email,
    name,
    phone,
    referral,
    router,
  ]);

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid
      extraScrollHeight={80}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Trade Spark</Text>
        <Text style={styles.subtitle}>Complete Your Profile</Text>

        {email && (
          <View style={styles.emailContainer}>
            <Ionicons name="mail" size={20} color="#FFD700" />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Setting up your profile...</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          placeholderTextColor="#B0BEC5"
          value={name}
          onChangeText={(text) => setName(text)}
          autoCapitalize="words"
          accessibilityLabel="Enter your full name"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number (10 digits) *"
          placeholderTextColor="#B0BEC5"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10}
          accessibilityLabel="Enter your phone number"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Referral Code *"
          placeholderTextColor="#B0BEC5"
          value={referral}
          onChangeText={(text) =>
            setReferral(text.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
          }
          maxLength={8}
          autoCapitalize="characters"
          accessibilityLabel="Enter referral code"
          editable={!loading}
        />

        <Text style={styles.infoText}>
          💡 You will receive a unique referral code after completing your
          profile to earn rewards!
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleContinue}
          disabled={loading}
          accessibilityLabel="Continue to dashboard"
        >
          <Text style={styles.buttonText}>
            {loading ? "Setting Up..." : "Continue"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.requiredText}>* All fields are required</Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: {
    flex: 1,
    backgroundColor: "#1A1A2E",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#E0E0E0",
    textAlign: "center",
    marginBottom: 20,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A2A3E",
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  emailText: {
    color: "#E0E0E0",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#2A2A3E",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#E0E0E0",
    borderWidth: 1,
    borderColor: "#3A3A50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  infoText: {
    color: "#B0BEC5",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  button: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: "#1A1A2E",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 18,
  },
  requiredText: {
    textAlign: "center",
    color: "#B0BEC5",
    fontSize: 14,
    fontStyle: "italic",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 26, 46, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#FFD700",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
});
