import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../lib/supabase";

interface HistoryItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralCode, setReferralCode] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdrawal">("deposit");
  const [amountText, setAmountText] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(null);

  const backendUrl = "http://192.168.31.119:5000"; // Or update to production URL

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        router.replace("/(auth)/signin");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", session.user.id)
        .single();

      if (userError || !userData) {
        Alert.alert("Error", "Failed to load user data");
        setLoading(false);
        return;
      }

      setFetchedUserId(userData.id);

      // Fetch wallet balance
      await fetchBalance(userData.id);

      // Fetch referral code and stats
      const { data: referralData, error: referralError } = await supabase
        .from("referrals")
        .select("referral_code, referred_count, points")
        .eq("user_id", userData.id)
        .single();

      if (referralError) {
        Alert.alert("Error", referralError.message);
      } else if (referralData) {
        setReferralCode(referralData.referral_code);
        setTotalReferrals(referralData.referred_count || 0);
        setRewardPoints(referralData.points || 0);
      }

      // Fetch history
      await fetchTransactions(userData.id);

      setLoading(false);
    };

    fetchUser();
  }, [router]);

  const fetchBalance = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setWalletBalance(0);
    } else {
      setWalletBalance(Number(data?.balance ?? 0));
    }
    setLoading(false);
  };

  const fetchTransactions = async (userId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setHistory(data || []);
      setTotalDeposits(
        data
          ?.filter((item) => item.type.toLowerCase() === "deposit")
          .reduce((sum, item) => sum + item.amount, 0) || 0
      );
      setTotalWithdrawals(
        data
          ?.filter((item) => item.type.toLowerCase() === "withdrawal")
          .reduce((sum, item) => sum + item.amount, 0) || 0
      );
      const today = new Date().toISOString().split("T")[0];
      setTodayEarnings(
        data
          ?.filter(
            (item) =>
              item.type.toLowerCase() === "earning" &&
              item.created_at.split("T")[0] === today
          )
          .reduce((sum, item) => sum + item.amount, 0) || 0
      );
      setTotalEarnings(
        data
          ?.filter((item) => item.type.toLowerCase() === "earning")
          .reduce((sum, item) => sum + item.amount, 0) || 0
      );
    }
  };

  const openModal = (m: "deposit" | "withdrawal") => {
    setMode(m);
    setAmountText("");
    setModalVisible(true);
  };

  const submit = async () => {
    const amount = Number(amountText);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number");
      return;
    }

    setModalVisible(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !fetchedUserId) {
      Alert.alert("Not signed in");
      return;
    }

    try {
      if (mode === "deposit") {
        setLoading(true);
        const resp = await fetch(`${backendUrl}/create-order`, {
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
          setLoading(false);
          return;
        }

        setPendingOrderId(data.order_id || null);
        setPendingAmount(amount);

        if (data.payment_link) {
          setCheckoutUrl(data.payment_link);
        } else {
          Alert.alert("Error", "No payment link returned by backend");
        }
        setLoading(false);
      } else {
        setLoading(true);
        // Assuming a RPC for withdrawal to handle validation, deduction, transaction
        const { error } = await supabase.rpc("withdraw", {
          p_user_id: fetchedUserId, // Use internal user_id
          p_amount: amount,
        });
        if (error) throw error;
        await fetchBalance(fetchedUserId);
        await fetchTransactions(fetchedUserId);
        Alert.alert("Success", `Withdrew ₹${amount.toFixed(2)}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err?.message ?? "Unknown error");
      setLoading(false);
    }
  };

  const onWebViewNavChange = async (navState: any) => {
    const url: string = navState.url || "";
    if (url.includes("cf-return")) {
      setCheckoutUrl(null);

      if (!pendingOrderId) {
        Alert.alert("Error", "Order ID missing after return.");
        return;
      }

      try {
        setLoading(true);
        const resp = await fetch(`${backendUrl}/verify-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: pendingOrderId }),
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
          if (fetchedUserId) {
            await fetchBalance(fetchedUserId);
            await fetchTransactions(fetchedUserId);
          }
          Alert.alert("Deposit successful", `₹${pendingAmount} added`);
        } else {
          Alert.alert("Payment not confirmed", data.status || "Unknown");
        }
      } catch (err: any) {
        Alert.alert("Error verifying payment", err?.message ?? String(err));
      } finally {
        setPendingOrderId(null);
        setPendingAmount(null);
        setLoading(false);
      }
    }
  };

  const handleCopyReferral = async () => {
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      Alert.alert("Copied!", "Referral code copied to clipboard.");
    }
  };

  if (checkoutUrl) {
    return (
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={onWebViewNavChange}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
      />
    );
  }

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
      {/* Account Overview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Overview</Text>
        <View style={styles.card}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewBox}>
              <Text style={styles.amountText}>₹{walletBalance.toFixed(2)}</Text>
              <Text style={styles.label}>Current Balance</Text>
            </View>
            <View style={styles.overviewBox}>
              <Text style={styles.amountText}>₹{todayEarnings.toFixed(2)}</Text>
              <Text style={styles.label}>Today Earnings</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewBox}>
              <Text style={styles.amountText}>₹{totalEarnings.toFixed(2)}</Text>
              <Text style={styles.label}>Total Earnings</Text>
            </View>
            <View style={styles.overviewBox}>
              <Text style={styles.amountText}>
                ₹{totalWithdrawals.toFixed(2)}
              </Text>
              <Text style={styles.label}>Total Withdrawals</Text>
            </View>
          </View>
          <View style={styles.overviewRow}>
            <View style={styles.overviewBox}>
              <Text style={styles.amountText}>₹{totalDeposits.toFixed(2)}</Text>
              <Text style={styles.label}>Total Deposits</Text>
            </View>
            <View style={styles.overviewBox}>
              <Text style={styles.amountText}>{totalReferrals}</Text>
              <Text style={styles.label}>Referrals</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#2E7D32" }]}
            onPress={() => openModal("deposit")}
          >
            <Text style={styles.actionButtonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#FFB300" }]}
            onPress={() => openModal("withdrawal")}
          >
            <Text style={styles.actionButtonText}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#1976D2" }]}
            onPress={() => router.push("/(tabs)/trade")}
          >
            <Text style={styles.actionButtonText}>Start Trading</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transactions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Type</Text>
            <Text style={styles.tableHeaderText}>Amount</Text>
            <Text style={styles.tableHeaderText}>Status</Text>
            <Text style={styles.tableHeaderText}>Date</Text>
          </View>
          {history.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.type}</Text>
              <Text style={styles.tableCell}>₹{item.amount.toFixed(2)}</Text>
              <Text style={styles.tableCell}>{item.status}</Text>
              <Text style={styles.tableCell}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Referral Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <View style={styles.card}>
          <View style={styles.referralRow}>
            <Text style={styles.referralCodeText}>{referralCode || "N/A"}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyReferral}
          >
            <Text style={styles.copyButtonText}>Copy Code</Text>
          </TouchableOpacity>
          <Text style={styles.referralText}>
            Share this code with friends to earn rewards!
          </Text>
        </View>
      </View>

      {/* Referral Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Referral Stats</Text>
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Total Referrals</Text>
            <Text style={styles.statsValue}>{totalReferrals}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Reward Points</Text>
            <Text style={styles.statsValue}>{rewardPoints}</Text>
          </View>
        </View>
      </View>

      {/* Modal for Deposit/Withdrawal */}
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
                onPress={submit}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E", padding: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
  },
  loadingText: { color: "#FFD700", marginTop: 10, fontSize: 18 },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#2A2A3E",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  overviewBox: {
    backgroundColor: "#3A3A50",
    borderRadius: 20,
    padding: 10,
    width: "50%",
    marginVertical: 8,
    alignItems: "center",
    marginLeft: -5,
    marginRight: -5,
  },
  amountText: {
    color: "#BB86FC",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  label: { color: "#B0BEC5", fontSize: 14, textAlign: "center" },
  actionButton: {
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A50",
    paddingBottom: 10,
    marginBottom: 10,
  },
  tableHeaderText: { fontWeight: "bold", color: "#CFD8DC", fontSize: 14 },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A50",
  },
  tableCell: { color: "#E0E0E0", fontSize: 14 },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  referralCodeText: {
    fontSize: 26,
    color: "#BB86FC",
    fontWeight: "bold",
  },
  referralText: { color: "#B0BEC5", textAlign: "center", fontSize: 14 },
  copyButton: {
    marginLeft: 50,
    marginRight: 50,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#4a90e2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: 10,
    elevation: 5,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A50",
  },
  statsLabel: { color: "#CFD8DC", fontSize: 16 },
  statsValue: { color: "#4CAF50", fontSize: 16, fontWeight: "bold" },
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
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
