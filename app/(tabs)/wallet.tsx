import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Wallet() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.balance}>$020 Balance</Text>
        <Text style={styles.amount}>$12,345.67 USD</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#1A1A2E" },
  title: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#0D0D1E",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  balance: { color: "#E5E7EB", fontSize: 14, marginBottom: 5 },
  amount: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 15 },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
});
