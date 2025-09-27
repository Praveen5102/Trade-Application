import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { supabase } from "../../supabaseClient";

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

  const validateInputs = () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters!");
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      Alert.alert("Error", "Phone number must be 10 digits!");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Invalid email address!");
      return false;
    }
    return true;
  };

  const findReferrer = async (referralCode: string) => {
    if (!referralCode) return null;

    const normalized = referralCode.trim().toUpperCase();

    if (normalized === "TEST2024") return "test";

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
  };

  const handleSignUp = async () => {
    if (!validateInputs()) return;
    setLoading(true);

    try {
      let referredBy: string | null = null;
      if (referral) {
        referredBy = await findReferrer(referral);
        if (!referredBy) {
          setLoading(false);
          Alert.alert("Invalid Referral", "Referral code not valid.");
          return;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone } },
      });

      if (authError) {
        Alert.alert("Signup Error", authError.message);
        setLoading(false);
        return;
      }

      const authId = authData.user?.id;
      if (!authId) throw new Error("Failed to create account");

      const { data: insertData, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            auth_id: authId,
            email: email.toLowerCase(),
            full_name: name,
            phone,
            referred_by: referredBy === "test" ? null : referredBy,
          },
        ])
        .select();

      if (insertError) throw insertError;

      const userId = insertData[0].id;

      if (referredBy && referredBy !== "test") {
        await supabase.rpc("process_referral", {
          referrer_user_id: referredBy,
          referred_user_id: userId,
          ref_code: referral.toUpperCase(),
        });
      }

      Alert.alert("Success!", "Account created successfully!", [
        {
          text: "Continue",
          onPress: () => router.replace("/(tabs)/Dashboard"),
        },
      ]);
    } catch (err: any) {
      console.error("Signup error:", err);
      Alert.alert("Error", err.message || "Signup failed. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid
      extraScrollHeight={80}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Trade Spark</Text>
        <Text style={styles.subtitle}>Create Your Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number (10 digits)"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Password (min 6 chars)"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={22}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Referral Code (optional)"
          placeholderTextColor="#999"
          value={referral}
          onChangeText={(text) =>
            setReferral(text.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
          }
          maxLength={8}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleSignUp}
          disabled={loading}
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
    color: "#E5E7EB",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
  },
  eyeIcon: { paddingHorizontal: 15 },
  button: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: "#1A1A2E",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 18,
  },
  footer: {
    textAlign: "center",
    color: "#E5E7EB",
    marginTop: 10,
    fontSize: 16,
  },
  link: { color: "#FFD700", fontWeight: "600" },
});
