import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../supabaseClient";

export default function Profile() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [name, setName] = useState("John Doe");
  const [mobile, setMobile] = useState("+91-9848227185");
  const [referralCode, setReferralCode] = useState("TRADESPARK123");

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user.email ?? "");
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/signin");
  };

  const handleEdit = () => {
    // Add edit functionality here
    console.log("Edit button pressed");
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <Ionicons
          name="person-circle"
          size={60}
          color="#ccc"
          style={styles.profileIcon}
        />
        <Text style={styles.sectionTitle}>{userEmail}</Text>
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Basic Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Mobile:</Text>
            <Text style={styles.value}>{mobile}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Referral Code:</Text>
            <Text style={styles.value}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.historySection}>
          <TouchableOpacity style={styles.historyItem}>
            <Ionicons name="document-text" size={20} color="#ccc" />
            <Text style={styles.historyText}>Deposits History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyItem}>
            <Ionicons name="document-text" size={20} color="#ccc" />
            <Text style={styles.historyText}>Withdrawals History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyItem}>
            <Ionicons name="document-text" size={20} color="#ccc" />
            <Text style={styles.historyText}>Trades History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButton}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A2E",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#0D0D1E",
  },
  headerText: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
  },
  profileSection: {
    padding: 20,
    alignItems: "center",
  },
  profileIcon: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#fff",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
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
  label: {
    color: "#555",
    fontSize: 14,
  },
  value: {
    color: "#333",
    fontSize: 14,
  },
  editButton: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  historySection: {
    width: "100%",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  historyText: {
    color: "#333",
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#a92828ff",
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    width: "80%",
    padding: 8,
    borderRadius: 10,
    marginLeft: "10%",
  },
});
