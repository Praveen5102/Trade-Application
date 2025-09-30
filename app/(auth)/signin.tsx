import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Auth Session
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "your-web-client-id", // Replace with actual Google web client ID
    iosClientId: "your-ios-client-id", // Replace with actual Google iOS client ID
    androidClientId: "your-android-client-id", // Replace with actual Google Android client ID
  });

  // Handle Google Sign-In response
  const handleGoogleLogin = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        throw new Error(error.message);
      }

      router.replace("/(tabs)/Dashboard");
    } catch (err: any) {
      console.error("Google login error:", err);
      Alert.alert(
        "Error",
        err.message || "Google login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;

      if (!id_token) {
        Alert.alert("Error", "No ID token received from Google.");
        return;
      }

      handleGoogleLogin(id_token);
    } else if (response?.type === "error") {
      Alert.alert("Error", "Google authentication failed. Please try again.");
    }
  }, [response, handleGoogleLogin]);

  // Email & Password login
  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      router.replace("/(tabs)/Dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      Alert.alert("Error", err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  // Forgot Password handler
  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email to reset password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: "your-app-reset-password-url", // Replace with your app's reset URL or remove if not using deep links
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      Alert.alert("Success", "Check your email for the password reset link.");
    } catch (err: any) {
      console.error("Reset password error:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

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

        {/* Email Input */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#B0BEC5"
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Enter your email address"
        />

        {/* Password Input */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Password"
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

        {/* Forgot Password */}
        <TouchableOpacity
          onPress={handleForgotPassword}
          style={styles.forgotButton}
        >
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityLabel="Sign in to Trade Spark"
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>OR</Text>

        {/* Google Login */}
        <TouchableOpacity
          style={[styles.socialButton, loading && { opacity: 0.6 }]}
          disabled={!request || loading}
          onPress={() => promptAsync()}
          accessibilityLabel="Sign in with Google"
        >
          <Ionicons name="logo-google" size={20} color="#E0E0E0" />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Phone Login */}
        <TouchableOpacity
          style={[styles.socialButton, loading && { opacity: 0.6 }]}
          disabled={loading}
          accessibilityLabel="Sign in with mobile number"
        >
          <Link href="/(auth)/PhoneLogin" style={styles.socialLink}>
            <Ionicons name="call" size={20} color="#E0E0E0" />
            <Text style={styles.socialButtonText}>
              Continue with Mobile Number
            </Text>
          </Link>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          Don’t have an account?{" "}
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
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 15,
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  socialLink: {
    flexDirection: "row",
    alignItems: "center",
  },
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
