import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Trade() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Enter Trade Amount" />
        <Text style={styles.balance}>
          Available Balance $12,345.67 | Remaining: $12,345.67
        </Text>
        <TouchableOpacity style={styles.tradeButton}>
          <Text style={styles.tradeButtonText}>Execute Trade</Text>
        </TouchableOpacity>
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
