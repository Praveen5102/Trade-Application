// app/(tabs)/trade.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../api/apiClient";

type MarketItem = {
  symbol: string;
  name?: string;
  price: number;
  buyPrice?: number;
  sellPrice?: number;
  change?: number; // percent
};

export default function Trade() {
  const [search, setSearch] = useState("");
  const [list, setList] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPopular();
  }, []);

  const loadPopular = async () => {
    setLoading(true);
    try {
      const res = await api.get("/stocks/popular");
      const data = res.data?.data ?? [];
      if (data.length) {
        setList(data);
        return;
      }
    } catch (err) {
      // Ignore — fallback to public crypto for demo
      console.warn("popular API failed, falling back to public", err);
    }

    // Fallback demo: small set via Binance public API
    try {
      const resp = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      const raw = await resp.json();
      const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "SOLUSDT"];
      const mapped = raw
        .filter((r: any) => symbols.includes(r.symbol))
        .map((r: any) => ({
          symbol: r.symbol.replace("USDT", "/USDT"),
          price: parseFloat(r.lastPrice),
          buyPrice: parseFloat(r.bidPrice || r.lastPrice),
          sellPrice: parseFloat(r.askPrice || r.lastPrice),
          change: parseFloat(r.priceChangePercent),
        }));
      setList(mapped);
    } catch (err) {
      console.error("binance fallback failed", err);
      Alert.alert("Error", "Failed to load market data");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (item: MarketItem) => {
    // route to stock detail, pass symbol and price
    router.push({
      pathname: "/stockDetail",
      params: {
        symbol: item.symbol,
        price: String(item.price),
        change: String(item.change ?? 0),
      },
    });
  };

  const filtered = list.filter(
    (it) =>
      it.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (it.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search symbol or name (e.g., MRF, BTC)"
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <Text style={styles.title}>Live Market</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" />
      ) : (
        <>
          {/* Horizontal mini-cards */}
          <FlatList
            data={filtered}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.symbol}
            contentContainerStyle={{ paddingVertical: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.miniCard}
                onPress={() => openDetail(item)}
              >
                <Text style={styles.sym}>{item.symbol}</Text>
                <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
                <Text
                  style={[
                    styles.change,
                    { color: (item.change ?? 0) >= 0 ? "#10B981" : "#EF4444" },
                  ]}
                >
                  {(item.change ?? 0) >= 0
                    ? `+${(item.change ?? 0).toFixed(2)}%`
                    : `${(item.change ?? 0).toFixed(2)}%`}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Table style with buy/sell columns */}
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 2 }]}>Symbol</Text>
            <Text style={[styles.col, { flex: 1 }]}>Sell</Text>
            <Text style={[styles.col, { flex: 1 }]}>Buy</Text>
            <Text style={[styles.col, { flex: 1 }]}>24h</Text>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.symbol}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => openDetail(item)}
              >
                <Text style={[styles.colText, { flex: 2 }]}>{item.symbol}</Text>
                <Text style={[styles.colText, { flex: 1 }]}>
                  {(item.sellPrice ?? item.price).toFixed(2)}
                </Text>
                <Text style={[styles.colText, { flex: 1 }]}>
                  {(item.buyPrice ?? item.price).toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.colText,
                    {
                      flex: 1,
                      color: (item.change ?? 0) >= 0 ? "#10B981" : "#EF4444",
                    },
                  ]}
                >
                  {(item.change ?? 0) >= 0
                    ? `+${(item.change ?? 0).toFixed(2)}%`
                    : `${(item.change ?? 0).toFixed(2)}%`}
                </Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}

const w = Dimensions.get("window").width;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Slightly lighter dark blue for a modern feel
    padding: 16,
  },
  search: {
    backgroundColor: "#1E293B", // Softer dark shade for input
    color: "#F3F4F6",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155", // Subtle border for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android shadow
  },
  title: {
    color: "#F3F4F6",
    fontWeight: "700",
    fontSize: 24, // Larger title for emphasis
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  miniCard: {
    width: Math.round(w * 0.38), // Slightly wider cards
    backgroundColor: "#1E293B",
    marginRight: 12,
    padding: 16,
    borderRadius: 16, // Softer corners
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4, // For Android
    borderWidth: 1,
    borderColor: "#2D3748", // Subtle border for cards
  },
  sym: {
    color: "#F3F4F6",
    fontWeight: "700",
    fontSize: 18, // Larger symbol text
    letterSpacing: 0.5,
  },
  price: {
    color: "#D1D5DB",
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  change: {
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2D3748",
    backgroundColor: "#1E293B", // Header background for contrast
    borderRadius: 8,
  },
  col: {
    color: "#9CA3AF",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#111827", // Alternating row background
    borderRadius: 8,
    marginVertical: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  colText: {
    color: "#F3F4F6",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
});
