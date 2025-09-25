import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabaseClient";

export default function Wallet() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amountText, setAmountText] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchBalance();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchBalance = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBalance(0);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setBalance(0);
    } else {
      setBalance(Number(data?.balance ?? 0));
    }
    setLoading(false);
  };

  const openModal = (m: "deposit" | "withdraw") => {
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
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      Alert.alert("Not signed in");
      return;
    }

    try {
      if (mode === "deposit") {
        const { error } = await supabase.rpc("deposit", {
          user_uuid: user.id,
          deposit_amount: amount,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("withdraw", {
          user_uuid: user.id,
          withdraw_amount: amount,
        });
        if (error) throw error;
      }

      await fetchBalance();
      Alert.alert(
        "Success",
        `${mode === "deposit" ? "Deposited" : "Withdrew"} $${amount.toFixed(2)}`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Unknown error");
      setLoading(false);
    }
  };

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
        <Text style={styles.amount}>${balance.toFixed(2)} USD</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => openModal("deposit")}
          >
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => openModal("withdraw")}
          >
            <Text style={styles.buttonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
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
              placeholder="Amount"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, { flex: 1 }]}
                onPress={submit}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  { flex: 1, backgroundColor: "#6B7280", marginLeft: 8 },
                ]}
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
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#1A1A2E",
    justifyContent: "center",
  },
  containerCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#FFD700" },
  card: {
    backgroundColor: "#0D0D1E",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  balance: { color: "#E5E7EB", fontSize: 14, marginBottom: 5 },
  amount: { color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 15 },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    flex: 1,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
});
