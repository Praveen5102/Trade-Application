import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabaseClient";

export default function Trade() {
  const [tradeAmount, setTradeAmount] = useState("");
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      if (!error) setBalance(data?.balance ?? 0);
    }
  };

  const handleTrade = async () => {
    const amount = parseFloat(tradeAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Error", "Enter a valid trade amount.");
      return;
    }
    if (amount > balance) {
      Alert.alert("Error", "Insufficient balance.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Update balance
    const { error } = await supabase
      .from("profiles")
      .update({ balance: balance - amount })
      .eq("id", user.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // Log trade
    await supabase
      .from("trades")
      .insert([{ user_id: user.id, amount, date: new Date() }]);

    setBalance(balance - amount);
    setTradeAmount("");
    Alert.alert("Success", `Trade executed: $${amount}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Enter Trade Amount"
          value={tradeAmount}
          keyboardType="numeric"
          onChangeText={setTradeAmount}
        />
        <Text style={styles.balance}>
          Available Balance: ${balance.toFixed(2)}
        </Text>
        <TouchableOpacity style={styles.tradeButton} onPress={handleTrade}>
          <Text style={styles.tradeButtonText}>Execute Trade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#1A1A2E" },
  card: {
    backgroundColor: "#0D0D1E",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  balance: { color: "#E5E7EB", fontSize: 14, marginBottom: 10 },
  tradeButton: {
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  tradeButtonText: { color: "#fff", fontWeight: "600" },
});
