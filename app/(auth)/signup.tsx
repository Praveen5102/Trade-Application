import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateInputs = useCallback(() => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      Alert.alert("Error", "Phone number must be 10 digits.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Invalid email address.");
      return false;
    }
    return true;
  }, [name, email, phone, password, confirmPassword]);

  const findReferrer = useCallback(async (referralCode: string) => {
    if (!referralCode) return null;

    const normalized = referralCode.trim().toUpperCase();

    if (normalized === "TEST2024") return "test";

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

  const handleSignUp = useCallback(async () => {
    if (!validateInputs()) return;
    setLoading(true);

    try {
      // Check if email already exists
      const { data: existingUser, error: emailCheckError } = await supabase
        .from("users")
        .select("email")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (emailCheckError) {
        throw new Error("Failed to check email availability.");
      }
      if (existingUser) {
        Alert.alert("Error", "Email already in use.");
        return;
      }

      let referredBy: string | null = null;
      if (referral) {
        referredBy = await findReferrer(referral);
        if (!referredBy) {
          Alert.alert("Error", "Invalid referral code.");
          return;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone } },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const authId = authData.user?.id;
      if (!authId) {
        throw new Error("Failed to create account.");
      }

      const { data: insertData, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            auth_id: authId,
            email: email.toLowerCase(),
            full_name: name.trim(),
            phone,
            referred_by: referredBy === "test" ? null : referredBy,
          },
        ])
        .select();

      if (insertError) {
        throw new Error(insertError.message);
      }

      const userId = insertData[0].id;

      // Initialize wallet for new user
      const { error: walletError } = await supabase
        .from("wallets")
        .insert({ user_id: userId, balance: 0 });

      if (walletError) {
        throw new Error("Failed to initialize wallet.");
      }

      if (referredBy && referredBy !== "test") {
        const { error: referralError } = await supabase.rpc(
          "process_referral",
          {
            referrer_user_id: referredBy,
            referred_user_id: userId,
            ref_code: referral.toUpperCase(),
          }
        );

        if (referralError) {
          console.error("Referral processing error:", referralError.message);
        }
      }

      Alert.alert("Success", "Account created successfully!", [
        {
          text: "Continue",
          onPress: () => router.replace("/(tabs)/Dashboard"),
        },
      ]);
    } catch (err: any) {
      console.error("Signup error:", err);
      Alert.alert("Error", err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [validateInputs, findReferrer, email, name, phone, password, referral]);

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid
      extraScrollHeight={80}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Trade Spark</Text>
        <Text style={styles.subtitle}>Create Your Account</Text>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Creating Account...</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#B0BEC5"
          value={name}
          onChangeText={(text) => setName(text.trim())}
          autoCapitalize="words"
          accessibilityLabel="Enter your full name"
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#B0BEC5"
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Enter your email address"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number (10 digits)"
          placeholderTextColor="#B0BEC5"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10}
          accessibilityLabel="Enter your phone number"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Password (min 6 chars)"
            placeholderTextColor="#B0BEC5"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Enter your password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            accessibilityLabel={
              showPassword ? "Hide password" : "Show password"
            }
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#B0BEC5"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Confirm Password"
            placeholderTextColor="#B0BEC5"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            accessibilityLabel="Confirm your password"
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
            accessibilityLabel={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={22}
              color="#B0BEC5"
            />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Referral Code (optional)"
          placeholderTextColor="#B0BEC5"
          value={referral}
          onChangeText={(text) =>
            setReferral(text.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
          }
          maxLength={8}
          autoCapitalize="characters"
          accessibilityLabel="Enter referral code (optional)"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleSignUp}
          disabled={loading}
          accessibilityLabel="Sign up for Trade Spark"
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating Account..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Already have an account?{" "}
          <Link href="/(auth)/signin">
            <Text style={styles.link}>Login here</Text>
          </Link>
        </Text>
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
    marginBottom: 30,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A3E",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#3A3A50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  eyeIcon: {
    paddingHorizontal: 15,
  },
  button: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
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
  footer: {
    textAlign: "center",
    color: "#E0E0E0",
    marginTop: 10,
    fontSize: 16,
  },
  link: {
    color: "#FFD700",
    fontWeight: "600",
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
