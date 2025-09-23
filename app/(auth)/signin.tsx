import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabaseClient";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email and password!");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return Alert.alert("Error", error.message);

    Alert.alert("Success", "Logged in successfully!");
    router.replace("/(tabs)/Dashboard"); // ✅ Correct path
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trade Spark</Text>
      <Text style={styles.subtitle}>Welcome Back!</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Password"
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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <Text style={styles.orText}>OR</Text>
      <TouchableOpacity style={styles.socialButton} onPress={() => {}}>
        <Ionicons name="call" size={20} color="#fff" />
        <Text style={styles.socialButtonText}>Continue with Mobile Number</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.socialButton1} onPress={() => {}}>
        <Image
          source={require("@/assets/images/google.png")}
          style={styles.socialIcon}
        />
        <Text style={styles.socialButtonText1}>Continue with Gmail </Text>
      </TouchableOpacity>
      <Text style={styles.footer}>
        Don’t have an account?{" "}
        <Link href="/(auth)/signup">
          <Text style={styles.link}>Sign Up</Text>
        </Link>
      </Text>
      <Text style={styles.forgot}>Forgot Password?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eyeIcon: { paddingHorizontal: 10 },
  button: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
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
    backgroundColor: "#1E40AF", // deeper blue for contrast
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",

    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  socialButtonText: {
    color: "#F9FAFB", // softer white
    fontWeight: "700",
    marginLeft: 12,
    fontSize: 17,
    letterSpacing: 0.5,
  },
  socialIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  socialButton1: {
    flexDirection: "row",
    backgroundColor: "#fff", // deeper blue for contrast
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",

    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  socialButtonText1: {
    color: "#131314ff", // softer white
    fontWeight: "700",
    marginLeft: 12,
    fontSize: 17,
    letterSpacing: 0.5,
  },

  orText: {
    textAlign: "center",
    color: "#E5E7EB",
    marginVertical: 15,
    fontWeight: "500",
  },
  footer: {
    textAlign: "center",
    color: "#E5E7EB",
    marginTop: 10,
  },
  link: {
    color: "#FFD700",
    fontWeight: "600",
  },
  forgot: {
    textAlign: "center",
    color: "#FFD700",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
