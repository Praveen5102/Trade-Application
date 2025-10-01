// app/(auth)/signin.tsx
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      console.log("✅ Login successful:", data.session?.user.email);
      router.replace("/(tabs)/Dashboard");

      // AuthContext will handle the navigation automatically
    } catch (err: any) {
      Alert.alert("Error", err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email to reset password.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: "tradeapp://reset-password" }
      );
      if (error) throw error;
      Alert.alert("Success", "Check your email for the password reset link.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      const redirectTo = "exp://192.168.31.119:8081"; // Expo Go
      const authUrl = `${
        process.env.EXPO_PUBLIC_SUPABASE_URL
      }/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
        redirectTo
      )}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);

        // Expo Go: get access_token from hash
        const access_token = url.hash.match(/access_token=([^&]*)/)?.[1];
        const refresh_token = url.hash.match(/refresh_token=([^&]*)/)?.[1];

        if (access_token && refresh_token) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

          if (sessionError) throw sessionError;

          // Check if user is new or existing
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            // Check user metadata to determine if it's a new user
            // Supabase marks new users with created_at close to current time
            const userCreatedAt = new Date(user.created_at).getTime();
            const currentTime = Date.now();
            const timeDifference = currentTime - userCreatedAt;

            // If user was created less than 10 seconds ago, treat as new user
            const isNewUser = timeDifference < 10000;

            if (isNewUser) {
              console.log(
                "✅ New Google user - redirecting to GoogleSignin page"
              );
              router.replace("/(auth)/googleSignin");
            } else {
              console.log("✅ Existing Google user - redirecting to Dashboard");
              router.replace("/(tabs)/Dashboard");
            }
          }
        } else if (url.searchParams.get("code")) {
          // Standalone app: exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            result.url
          );
          if (error) throw error;

          // Check if user is new or existing
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const userCreatedAt = new Date(user.created_at).getTime();
            const currentTime = Date.now();
            const timeDifference = currentTime - userCreatedAt;

            const isNewUser = timeDifference < 10000;

            if (isNewUser) {
              console.log(
                "✅ New Google user - redirecting to GoogleSignin page"
              );
              router.replace("/(auth)/googleSignin");
            } else {
              console.log("✅ Existing Google user - redirecting to Dashboard");
              router.replace("/(tabs)/Dashboard");
            }
          }
        } else {
          Alert.alert("Error", "No access token or code returned from Google.");
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid
      extraScrollHeight={80}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Trade Spark</Text>
        <Text style={styles.subtitle}>Welcome Back!</Text>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Signing In...</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#B0BEC5"
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Password"
            placeholderTextColor="#B0BEC5"
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
              color="#B0BEC5"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleForgotPassword}
          style={styles.forgotButton}
        >
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>OR</Text>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogleSignIn}
        >
          <Ionicons name="logo-google" size={20} color="#E0E0E0" />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton}>
          <Link href="/(auth)/PhoneLogin" style={styles.socialLink}>
            <Ionicons name="call" size={20} color="#E0E0E0" />
            <Text style={styles.socialButtonText}>
              Continue with Mobile Number
            </Text>
          </Link>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Dont have an account?{" "}
          <Link href="/(auth)/signup">
            <Text style={styles.link}>Sign Up</Text>
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
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A3E",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#3A3A50",
  },
  eyeIcon: { paddingHorizontal: 15 },
  forgotButton: { alignSelf: "flex-end", marginBottom: 15 },
  forgot: {
    color: "#FFD700",
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },
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
  socialButton: {
    flexDirection: "row",
    backgroundColor: "#2A2A3E",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A50",
  },
  socialLink: { flexDirection: "row", alignItems: "center" },
  socialButtonText: {
    color: "#E0E0E0",
    fontWeight: "700",
    marginLeft: 12,
    fontSize: 16,
  },
  orText: {
    textAlign: "center",
    color: "#E0E0E0",
    marginVertical: 15,
    fontSize: 16,
  },
  footer: {
    textAlign: "center",
    color: "#E0E0E0",
    marginTop: 10,
    fontSize: 16,
  },
  link: { color: "#FFD700", fontWeight: "600" },
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
