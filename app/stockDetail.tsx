import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import api from "./api/apiClient";

export default function StockDetail() {
  const params: any = useLocalSearchParams();
  const router = useRouter();

  const symbol = String(params.symbol ?? "BTC/USDT");
  const priceNumber = Number(params.price ?? 0);
  const changeNumber = Number(params.change ?? 0);

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<number[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    fetchChart();
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const fetchChart = async () => {
    try {
      const s = symbol.replace("/", "");
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${s}&interval=1h&limit=30`
      );
      const data = await res.json();
      const closes = data.map((d: any) => parseFloat(d[4]));
      setChart(closes);
    } catch (err) {
      console.warn("chart fetch error", err);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await api.get("/balance");
      // backend should normalize balance into { balance: number }
      const b =
        res.data?.balance ?? res.data?.funds?.equity?.available_margin ?? 0;
      setBalance(Number(b));
    } catch (err) {
      console.warn("balance fetch error", err);
    }
  };

  const qtyNum = useMemo(
    () => Math.max(0, Math.floor(Number(quantity) || 0)),
    [quantity]
  );
  const total = useMemo(
    () => Number((qtyNum * priceNumber).toFixed(2)),
    [qtyNum, priceNumber]
  );

  const placeOrder = async () => {
    if (qtyNum <= 0) return Alert.alert("Enter quantity greater than 0");
    if (side === "BUY" && total > balance)
      return Alert.alert("Insufficient balance");

    setPlacing(true);
    try {
      const payload = {
        transaction_type: side,
        symbol,
        quantity: qtyNum,
        price: priceNumber || 0,
      };
      const res = await api.post("/trade", payload);
      if (res.data?.success ?? true) {
        // backend should send newBalance or success
        Alert.alert(
          "Trade placed",
          `${side} ${qtyNum} ${symbol} @ ${priceNumber}`
        );
        fetchBalance();
        router.back();
      } else {
        Alert.alert("Trade failed", res.data?.error || "Unknown error");
      }
    } catch (err: any) {
      console.error(
        "placeOrder error",
        err?.response?.data || err.message || err
      );
      Alert.alert("Trade failed", err?.response?.data?.error || "Server error");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.price}>₹{priceNumber.toFixed(2)}</Text>
          <Text
            style={[
              styles.change,
              { color: changeNumber >= 0 ? "#10B981" : "#EF4444" },
            ]}
          >
            {changeNumber.toFixed(2)}%
          </Text>
        </View>

        {/* top SELL / BUY selector with live prices */}
        <View style={styles.sideRow}>
          <TouchableOpacity
            style={[
              styles.sideBox,
              side === "SELL" ? styles.sideActiveSell : styles.sideInactive,
            ]}
            onPress={() => setSide("SELL")}
          >
            <Text
              style={
                side === "SELL"
                  ? styles.sideActiveText
                  : styles.sideInactiveText
              }
            >
              SELL
            </Text>
            <Text
              style={
                side === "SELL" ? styles.sideActivePrice : styles.sidePrice
              }
            >
              ₹{(priceNumber * 0.999).toFixed(2)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sideBox,
              side === "BUY" ? styles.sideActiveBuy : styles.sideInactive,
            ]}
            onPress={() => setSide("BUY")}
          >
            <Text
              style={
                side === "BUY" ? styles.sideActiveText : styles.sideInactiveText
              }
            >
              BUY
            </Text>
            <Text
              style={side === "BUY" ? styles.sideActivePrice : styles.sidePrice}
            >
              ₹{(priceNumber * 1.001).toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* amount / quantity input */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        <Text style={styles.totalText}>Total: ₹{total.toFixed(2)}</Text>

        {/* Chart */}
        {chart.length ? (
          <LineChart
            data={{
              labels: Array(chart.length).fill(""),
              datasets: [{ data: chart }],
            }}
            width={Dimensions.get("window").width - 32}
            height={240}
            withDots={false}
            withInnerLines={true}
            chartConfig={{
              backgroundGradientFrom: "#1E293B",
              backgroundGradientTo: "#1E293B",
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              strokeWidth: 2,
              propsForBackgroundLines: {
                stroke: "#334155",
                strokeDasharray: "4",
              },
              labelColor: () => "#9CA3AF",
              propsForLabels: { fontSize: 12 },
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 20, paddingRight: 16 }}
          />
        ) : (
          <ActivityIndicator
            size="large"
            color="#3B82F6"
            style={{ marginVertical: 24 }}
          />
        )}

        {/* wallet stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>₹{balance.toFixed(2)}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Required</Text>
            <Text style={styles.statValue}>₹{total.toFixed(2)}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>PIP Value</Text>
            <Text style={styles.statValue}>—</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={placeOrder}
          style={styles.cta}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color="#F3F4F6" />
          ) : (
            <Text style={styles.ctaText}>
              {side === "BUY" ? "Place BUY Trade" : "Place SELL Trade"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
    backgroundColor: "#0F172A", // Modern dark blue background
  },
  topRow: {
    marginBottom: 16,
    backgroundColor: "#1E293B", // Card-like background
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  symbol: {
    color: "#F3F4F6",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  price: {
    color: "#D1D5DB",
    marginTop: 8,
    fontSize: 20,
    fontWeight: "600",
  },
  change: {
    marginTop: 8,
    fontWeight: "600",
    fontSize: 16,
  },

  sideRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  sideBox: {
    flex: 0.48,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sideInactive: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  sideActiveBuy: {
    backgroundColor: "#0B6B3F",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  sideActiveSell: {
    backgroundColor: "#7B1B1B",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  sideActiveText: {
    color: "#F3F4F6",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  sideInactiveText: {
    color: "#9CA3AF",
    fontWeight: "700",
    fontSize: 16,
  },
  sidePrice: {
    color: "#D1D5DB",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  sideActivePrice: {
    color: "#F3F4F6",
    marginTop: 8,
    fontWeight: "700",
    fontSize: 14,
  },

  inputRow: {
    marginTop: 20,
  },
  inputLabel: {
    color: "#9CA3AF",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#F3F4F6",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  totalText: {
    color: "#D1D5DB",
    marginTop: 12,
    fontWeight: "600",
    fontSize: 16,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
  statValue: {
    color: "#F3F4F6",
    marginTop: 8,
    fontWeight: "700",
    fontSize: 16,
  },

  cta: {
    marginTop: 24,
    backgroundColor: "#3B82F6", // Blue for a more neutral CTA
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  ctaText: {
    color: "#F3F4F6",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
