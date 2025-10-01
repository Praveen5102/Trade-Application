import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../lib/supabase";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function Wallet() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdrawal">("deposit");
  const [amountText, setAmountText] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const backendUrl = "https://abcd1234.ngrok.io"; // Replace with your ngrok or production URL

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    fetchUserData();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBalance(0);
        setLoading(false);
        Alert.alert("Error", "Not signed in");
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (error || !userData) {
        Alert.alert("Error", "Failed to load user data");
        setLoading(false);
        return;
      }

      setUserId(userData.id);
      await fetchBalance(userData.id);
      await fetchTransactions(userData.id);
    } catch (err: any) {
      console.error("Fetch user data error:", err);
      Alert.alert("Error", "Failed to load user data");
      setLoading(false);
    }
  };

  const fetchBalance = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", uid)
        .single();

      if (error) {
        Alert.alert("Error", error.message);
        setBalance(0);
      } else {
        setBalance(Number(data?.balance ?? 0));
      }
    } catch (err: any) {
      console.error("Fetch balance error:", err);
      Alert.alert("Error", "Failed to load balance");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setTransactions(data || []);
      }
    } catch (err: any) {
      console.error("Fetch transactions error:", err);
      Alert.alert("Error", "Failed to load transactions");
    }
  };

  const openModal = (type: "deposit" | "withdrawal") => {
    setMode(type);
    setAmountText("");
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const amount = Number(amountText);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a positive number");
      return;
    }

    setModalVisible(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !userId) {
        Alert.alert("Error", "Not signed in");
        return;
      }

      setLoading(true);

      if (mode === "deposit") {
        const resp = await fetch(`${backendUrl}/api/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            customerId: user.id,
            email: user.email || "",
            phone: user.user_metadata?.phone || "",
          }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          Alert.alert("Error", data.error || "Failed to create order");
          return;
        }

        setPendingOrderId(data.order_id || null);
        setPendingAmount(amount);

        if (data.payment_link) {
          setCheckoutUrl(data.payment_link);
        } else {
          Alert.alert("Error", "No payment link returned");
        }
      } else {
        // Assuming RPC for withdrawal
        const { error } = await supabase.rpc("withdraw", {
          p_user_id: userId,
          p_amount: amount,
        });

        if (error) throw error;

        await fetchBalance(userId);
        await fetchTransactions(userId);
        Alert.alert("Success", `Withdrew ₹${amount.toFixed(2)}`);
      }
    } catch (err: any) {
      console.error("Transaction error:", err);
      Alert.alert("Error", err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewNavigation = async (navState: any) => {
    const url: string = navState.url || "";
    if (url.includes("cf-return")) {
      setCheckoutUrl(null);
      if (!pendingOrderId) {
        Alert.alert("Error", "Order ID missing after return.");
        return;
      }

      try {
        setLoading(true);
        const resp = await fetch(`${backendUrl}/api/verify-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: pendingOrderId }),
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
          if (userId) {
            await fetchBalance(userId);
            await fetchTransactions(userId);
          }
          Alert.alert(
            "Deposit Successful",
            `₹${pendingAmount?.toFixed(2)} added`
          );
        } else {
          Alert.alert("Payment Not Confirmed", data.status || "Unknown");
        }
      } catch (err: any) {
        console.error("Verify payment error:", err);
        Alert.alert("Error", "Failed to verify payment");
      } finally {
        setPendingOrderId(null);
        setPendingAmount(null);
        setLoading(false);
      }
    }
  };

  if (checkoutUrl) {
    return (
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleWebViewNavigation}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.containerCentered}>
        <Text style={styles.title}>Trade Spark</Text>
        <ActivityIndicator
          size="large"
          color="#FFD700"
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.balance}>Balance</Text>
        <Text style={styles.amount}>₹{balance.toFixed(2)}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#4CAF50" }]}
            onPress={() => openModal("deposit")}
          >
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#F44336" }]}
            onPress={() => openModal("withdrawal")}
          >
            <Text style={styles.buttonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <Text style={styles.transactionType}>{item.type}</Text>
              <Text style={styles.transactionAmount}>
                ₹{item.amount.toFixed(2)}
              </Text>
              <Text style={styles.transactionStatus}>{item.status}</Text>
              <Text style={styles.transactionDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions yet</Text>
          }
        />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {mode === "deposit" ? "Deposit" : "Withdraw"}
            </Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="numeric"
              placeholder="Enter Amount"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, backgroundColor: "#4CAF50" }]}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1, backgroundColor: "#6B7280" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#121212" },
  containerCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#FFD700" },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  balance: { color: "#B0BEC5", fontSize: 16, marginBottom: 5 },
  amount: {
    color: "#BB86FC",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  sectionTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2C",
  },
  transactionType: { color: "#E0E0E0", fontSize: 14 },
  transactionAmount: { color: "#BB86FC", fontSize: 14 },
  transactionStatus: { color: "#4CAF50", fontSize: 14 },
  transactionDate: { color: "#B0BEC5", fontSize: 12 },
  emptyText: { color: "#B0BEC5", textAlign: "center", marginTop: 10 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  modalTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 15,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    backgroundColor: "#2C2C2C",
    padding: 12,
    borderRadius: 10,
    color: "#E0E0E0",
    marginBottom: 15,
  },
});
