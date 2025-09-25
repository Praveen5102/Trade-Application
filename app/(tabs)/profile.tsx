import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabaseClient";

interface HistoryItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  date: string;
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/(auth)/signin");
        return;
      }
      setUser(session.user);

      // Fetch history (replace 'transactions' table with your table)
      const { data: historyData, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setHistory(historyData || []);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/signin");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={styles.profileSection}>
        <Ionicons
          name="person-circle"
          size={80}
          color="#ccc"
          style={styles.profileIcon}
        />
        <Text style={styles.emailText}>{user?.email}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Basic Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>
              {user?.user_metadata?.full_name || "John Doe"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Mobile:</Text>
            <Text style={styles.value}>
              {user?.user_metadata?.phone || "+91-0000000000"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Referral Code:</Text>
            <Text style={styles.value}>
              {user?.user_metadata?.referral || "TRADESPARK123"}
            </Text>
          </View>
        </View>

        {/* History Sections */}
        <Text style={styles.historyTitle}>History</Text>
        {["Deposit", "Withdraw", "Trade"].map((type) => (
          <View key={type} style={styles.historyCard}>
            <Text style={styles.historyCardTitle}>{type}s</Text>
            {history
              .filter((item) => item.type.toLowerCase() === type.toLowerCase())
              .slice(0, 3)
              .map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <Text style={styles.historyText}>
                    ${item.amount.toFixed(2)} | {item.status}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
              ))}
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E", padding: 20 },
  profileSection: { alignItems: "center" },
  profileIcon: { marginBottom: 10 },
  emailText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    width: "100%",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: { color: "#555", fontSize: 14 },
  value: { color: "#333", fontSize: 14 },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  historyCard: {
    backgroundColor: "#0D0D1E",
    borderRadius: 10,
    padding: 15,
    width: "100%",
    marginBottom: 15,
  },
  historyCardTitle: { color: "#FFD700", fontWeight: "bold", marginBottom: 10 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  historyText: { color: "#fff" },
  dateText: { color: "#ccc" },
  logoutButton: {
    backgroundColor: "#a92828",
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    width: "80%",
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
