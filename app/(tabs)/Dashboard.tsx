import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabaseClient";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [code, setCode] = useState("");

  // Check user session on mount
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUserEmail(session.user.email ?? null);
      } else {
        router.replace("/(auth)/signin");
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  // Trade handler
  const handleTrade = () => {
    if (!tradeAmount) {
      Alert.alert("Error", "Please enter a trade amount.");
      return;
    }
    Alert.alert("Success", `Trade executed: ${tradeAmount}`);
    setTradeAmount("");
  };

  // Apply code handler
  const handleApplyCode = () => {
    if (!code) {
      Alert.alert("Error", "Please enter a code.");
      return;
    }
    Alert.alert("Success", `Applied code: ${code}`);
    setCode("");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Wallet Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet</Text>
        <View style={styles.card}>
          <Text style={styles.amountText}>$12,345.67 USD</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Trading Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trading</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Enter Trade Amount"
            value={tradeAmount}
            onChangeText={setTradeAmount}
            keyboardType="numeric"
          />
          <Text style={styles.balanceText}>Available Balance: $12,345.67</Text>
          <TouchableOpacity style={styles.tradeButton} onPress={handleTrade}>
            <Text style={styles.tradeButtonText}>Execute Trade</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Code Apply Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apply Code</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={styles.tradeButton}
            onPress={handleApplyCode}
          >
            <Text style={styles.tradeButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
  },
  loadingText: { color: "#FFD700", marginTop: 10, fontSize: 18 },
  section: { padding: 20 },
  sectionTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#0D0D1E",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 15,
  },
  amountText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  buttonContainer: { flexDirection: "row", justifyContent: "space-between" },
  actionButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  actionButtonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  tradeButton: {
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  tradeButtonText: { color: "#fff", fontWeight: "600" },
  balanceText: { color: "#E5E7EB", fontSize: 14, marginBottom: 10 },
});
