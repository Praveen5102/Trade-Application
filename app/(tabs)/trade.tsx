import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { supabase } from "../lib/supabase";

type MarketItem = {
  symbol: string;
  price: number;
  buyPrice?: number;
  sellPrice?: number;
  change?: number;
};

type Depth = {
  bids: [number, number][];
  asks: [number, number][];
};

type Position = {
  id: string;
  symbol: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  created_at: string;
};

export default function Trade() {
  const [list, setList] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [depth, setDepth] = useState<Depth>({ bids: [], asks: [] });
  const [orderPrice, setOrderPrice] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<string>("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(0);
  const ws = useRef<WebSocket | null>(null);
  const currentDepthSub = useRef<string>("");
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(null);

  const symbols: string[] = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "ADAUSDT",
    "SOLUSDT",
    "XRPUSDT",
  ];

  // Animation values
  const cardScale = useSharedValue(1);
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(cardScale.value) }],
  }));

  useEffect(() => {
    const fetchUserAndBalance = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        Alert.alert("Error", "Please sign in to continue");
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
      await fetchPositions(userData.id);

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userData.id)
        .single();

      if (walletError || !walletData) {
        Alert.alert("Error", "Failed to load wallet balance");
        setBalance(0);
      } else {
        setBalance(walletData.balance ?? 0);
      }
    };

    fetchUserAndBalance();
    loadMarkets();
    setupWebSocket();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
      if (!state.isConnected) {
        Alert.alert(
          "Network Error",
          "No internet connection. Please check your network."
        );
      }
    });

    return () => {
      unsubscribe();
      if (ws.current) ws.current.close();
    };
  }, []);

  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      if (currentDepthSub.current) {
        ws.current.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [currentDepthSub.current],
            id: 2,
          })
        );
      }
      const newSub = `${selectedSymbol.toLowerCase()}@depth5@1000ms`;
      ws.current.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: [newSub],
          id: 3,
        })
      );
      currentDepthSub.current = newSub;
    }
  }, [selectedSymbol]);

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("https://api.binance.com/api/v3/ticker/24hr");
      if (!resp.ok) throw new Error("Network response was not ok");
      const raw = await resp.json();
      const mapped: MarketItem[] = raw
        .filter((r: any) => symbols.includes(r.symbol))
        .map((r: any) => ({
          symbol: r.symbol,
          price: parseFloat(r.lastPrice) || 0,
          buyPrice: parseFloat(r.bidPrice || r.lastPrice) || 0,
          sellPrice: parseFloat(r.askPrice || r.lastPrice) || 0,
          change: parseFloat(r.priceChangePercent) || 0,
        }));
      setList(mapped);
    } catch (err) {
      console.error("Market load failed:", err);
      Alert.alert("Error", "Failed to load market data. Retrying...");
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        setTimeout(loadMarkets, 3000);
      } else {
        Alert.alert(
          "Error",
          "Max retry attempts reached. Please check your connection."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const setupWebSocket = useCallback(() => {
    if (!isConnected) return;

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close();
    }

    ws.current = new WebSocket("wss://stream.binance.com:9443/ws");

    ws.current.onopen = () => {
      reconnectAttempts.current = 0;
      const tickerSubs = symbols.map((s) => `${s.toLowerCase()}@ticker`);
      ws.current?.send(
        JSON.stringify({ method: "SUBSCRIBE", params: tickerSubs, id: 1 })
      );
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === "24hrTicker" && data.s) {
          setList((prev) =>
            prev.map((item) =>
              item.symbol === data.s
                ? {
                    ...item,
                    price: parseFloat(data.c) || item.price,
                    buyPrice: parseFloat(data.b) || item.buyPrice,
                    sellPrice: parseFloat(data.a) || item.sellPrice,
                    change: parseFloat(data.P) || item.change,
                  }
                : item
            )
          );
        } else if (data.bids && data.asks) {
          setDepth({
            bids: data.bids.map(([p, q]: string[]) => [
              parseFloat(p) || 0,
              parseFloat(q) || 0,
            ]),
            asks: data.asks.map(([p, q]: string[]) => [
              parseFloat(p) || 0,
              parseFloat(q) || 0,
            ]),
          });
        }
      } catch (err) {
        console.error("WebSocket data parse error:", err);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        setTimeout(setupWebSocket, 3000);
      } else {
        Alert.alert(
          "Error",
          "WebSocket connection failed. Please check your network."
        );
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket closed");
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        setTimeout(setupWebSocket, 3000);
      }
    };
  }, [isConnected]);

  const fetchPositions = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) Alert.alert("Error", error.message);
    else setPositions(data || []);
  }, []);

  const handlePlaceOrder = useCallback(
    async (type: "buy" | "sell") => {
      if (!orderPrice || !orderQuantity) {
        Alert.alert("Error", "Please enter price and quantity.");
        return;
      }
      const priceNum = parseFloat(orderPrice);
      const qtyNum = parseFloat(orderQuantity);
      if (isNaN(priceNum) || isNaN(qtyNum) || priceNum <= 0 || qtyNum <= 0) {
        Alert.alert("Error", "Invalid price or quantity.");
        return;
      }

      if (!fetchedUserId) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      try {
        setLoading(true);
        const { error } = await supabase.from("positions").insert({
          user_id: fetchedUserId,
          symbol: selectedSymbol,
          quantity: qtyNum,
          entry_price: priceNum,
          current_price: priceNum,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        Alert.alert(
          "Success",
          `Order placed: ${type.toUpperCase()} ${qtyNum} ${selectedSymbol} at ${priceNum}`
        );
        await fetchPositions(fetchedUserId);
        setOrderPrice("");
        setOrderQuantity("");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to place order.");
      } finally {
        setLoading(false);
      }
    },
    [orderPrice, orderQuantity, selectedSymbol, fetchedUserId]
  );

  const calculatePnL = useCallback((pos: Position) => {
    const pnl = (pos.current_price - pos.entry_price) * pos.quantity;
    return pnl.toFixed(2);
  }, []);

  if (!isConnected) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>No internet connection...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Available Balance */}
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={styles.balanceCard}
      >
        <View style={styles.balanceHeader}>
          <Ionicons name="wallet-outline" size={24} color="#FFD700" />
          <Text style={styles.sectionTitle}>Available Balance</Text>
        </View>
        <Text style={styles.balanceText}>
          ₹
          {balance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </Animated.View>

      {/* Market Watchlist */}
      <Text style={styles.sectionTitle}>Watchlist</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 12 }}
        >
          {list.map((item) => (
            <TouchableOpacity
              key={item.symbol}
              style={[styles.miniCard, animatedCardStyle]}
              onPress={() => {
                setSelectedSymbol(item.symbol);
                cardScale.value = 1.05;
                setTimeout(() => (cardScale.value = 1), 200);
              }}
              accessibilityLabel={`Select ${item.symbol} for trading`}
            >
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.card}
              >
                <Text style={styles.sym}>{item.symbol}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                <View style={styles.changeContainer}>
                  <Ionicons
                    name={(item.change ?? 0) >= 0 ? "arrow-up" : "arrow-down"}
                    size={14}
                    color={(item.change ?? 0) >= 0 ? "#00FF00" : "#FF0000"}
                  />
                  <Text
                    style={[
                      styles.change,
                      {
                        color: (item.change ?? 0) >= 0 ? "#00FF00" : "#FF0000",
                      },
                    ]}
                  >
                    {(item.change ?? 0).toFixed(2)}%
                  </Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Chart Section */}
      <Text style={styles.sectionTitle}>Live Chart</Text>
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={styles.chartContainer}
      >
        <View style={styles.scrollIndicator}>
          <Ionicons name="chevron-forward" size={20} color="#FFD700" />
          <Text style={styles.scrollIndicatorText}>Scroll to view chart</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <WebView
            source={{
              uri: `https://www.tradingview.com/chart/?symbol=BINANCE:${selectedSymbol}&theme=dark`,
            }}
            style={{ width: 800, height: 450 }}
            onError={({ nativeEvent }) => {
              console.error("WebView error:", nativeEvent);
              Alert.alert("Error", "Failed to load chart. Please try again.");
            }}
          />
        </ScrollView>
      </Animated.View>

      {/* Market Overview */}
      <Text style={styles.sectionTitle}>Market Overview</Text>
      <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
        {list.map((item) => (
          <View key={item.symbol} style={styles.row}>
            <Text style={[styles.colText, { flex: 2 }]}>{item.symbol}</Text>
            <Text style={[styles.colText, { flex: 1, color: "#BB86FC" }]}>
              {(item.sellPrice ?? item.price).toFixed(2)}
            </Text>
            <Text style={[styles.colText, { flex: 1, color: "#BB86FC" }]}>
              {(item.buyPrice ?? item.price).toFixed(2)}
            </Text>
            <Text
              style={[
                styles.colText,
                {
                  flex: 1,
                  color: (item.change ?? 0) >= 0 ? "#00FF00" : "#FF0000",
                },
              ]}
            >
              {(item.change ?? 0).toFixed(2)}%
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Order Book */}
      <Text style={styles.sectionTitle}>Order Book - {selectedSymbol}</Text>
      <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
        <View style={styles.orderBookHeader}>
          <Text style={[styles.colText, { flex: 2 }]}>Price</Text>
          <Text style={[styles.colText, { flex: 1 }]}>Quantity</Text>
        </View>
        {depth.asks.slice(0, 5).map(([price, qty], index) => (
          <View key={`ask-${index}`} style={styles.orderRow}>
            <Text style={[styles.orderText, { flex: 2, color: "#BB86FC" }]}>
              {price.toFixed(2)}
            </Text>
            <Text style={[styles.orderText, { flex: 1 }]}>
              {qty.toFixed(4)}
            </Text>
          </View>
        ))}
        {depth.bids.slice(0, 5).map(([price, qty], index) => (
          <View key={`bid-${index}`} style={styles.orderRow}>
            <Text style={[styles.orderText, { flex: 2, color: "#BB86FC" }]}>
              {price.toFixed(2)}
            </Text>
            <Text style={[styles.orderText, { flex: 1 }]}>
              {qty.toFixed(4)}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Trading Panel */}
      <Text style={styles.sectionTitle}>Place Order</Text>
      <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
        <Text style={styles.label}>Symbol: {selectedSymbol}</Text>
        <TextInput
          placeholder="Price"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          keyboardType="numeric"
          value={orderPrice}
          onChangeText={setOrderPrice}
          accessibilityLabel="Enter order price"
        />
        <TextInput
          placeholder="Quantity"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          keyboardType="numeric"
          value={orderQuantity}
          onChangeText={setOrderQuantity}
          accessibilityLabel="Enter order quantity"
        />
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handlePlaceOrder("buy")}
            style={[styles.button, { backgroundColor: "#00FF00" }]}
            accessibilityLabel={`Place buy order for ${selectedSymbol}`}
          >
            <Text style={styles.buttonText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePlaceOrder("sell")}
            style={[styles.button, { backgroundColor: "#FF0000" }]}
            accessibilityLabel={`Place sell order for ${selectedSymbol}`}
          >
            <Text style={styles.buttonText}>Sell</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Positions */}
      <Text style={styles.sectionTitle}>Positions</Text>
      <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
        {positions.length === 0 ? (
          <Text style={styles.label}>No open positions</Text>
        ) : (
          <View>
            <View style={styles.positionHeader}>
              <Text style={[styles.colText, { flex: 1 }]}>Symbol</Text>
              <Text style={[styles.colText, { flex: 1 }]}>Quantity</Text>
              <Text style={[styles.colText, { flex: 1 }]}>Entry Price</Text>
              <Text style={[styles.colText, { flex: 1 }]}>P/L</Text>
            </View>
            {positions.map((item) => (
              <View key={item.id} style={styles.positionRow}>
                <Text style={[styles.colText, { flex: 1 }]}>{item.symbol}</Text>
                <Text style={[styles.colText, { flex: 1 }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.colText, { flex: 1 }]}>
                  ${item.entry_price.toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.colText,
                    {
                      flex: 1,
                      color:
                        item.current_price - item.entry_price >= 0
                          ? "#00FF00"
                          : "#FF0000",
                    },
                  ]}
                >
                  ${calculatePnL(item)} (
                  {(
                    ((item.current_price - item.entry_price) /
                      item.entry_price) *
                    100
                  ).toFixed(2)}
                  %)
                </Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A1A2E", padding: 20 },
  contentContainer: { paddingBottom: 30 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
  },
  loadingText: { color: "#FFD700", marginTop: 10, fontSize: 18 },
  sectionTitle: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  balanceCard: {
    backgroundColor: "#2A2A3E",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceText: { color: "#E0E0E0", fontSize: 28, fontWeight: "700" },
  card: {
    backgroundColor: "#2A2A3E",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  miniCard: {
    width: 150,
    marginRight: 12,
    borderRadius: 15,
    overflow: "hidden",
  },
  sym: { color: "#E0E0E0", fontWeight: "700", fontSize: 16 },
  price: { color: "#B0BEC5", marginTop: 6, fontSize: 14 },
  changeContainer: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  change: { marginLeft: 4, fontWeight: "600", fontSize: 14 },
  chartContainer: {
    height: 450,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3A3A50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  scrollIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
  scrollIndicatorText: { color: "#FFD700", fontSize: 12, marginLeft: 4 },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A50",
  },
  colText: {
    color: "#E0E0E0",
    textAlign: "left",
    fontSize: 14,
    fontWeight: "500",
  },
  orderBookHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A50",
  },
  orderRow: { flexDirection: "row", paddingVertical: 6 },
  orderText: { color: "#E0E0E0", textAlign: "left", fontSize: 14 },
  label: { color: "#B0BEC5", marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: "#2C2C2C",
    color: "#E0E0E0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#3A3A50",
  },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  positionHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A50",
    backgroundColor: "#2A2A3E",
  },
  positionRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A50",
    alignItems: "center",
  },
});
