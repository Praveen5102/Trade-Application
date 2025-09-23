import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1A1A2E" },
        headerTitleStyle: { color: "#FFD700", fontWeight: "bold" },
        headerTintColor: "#FFD700",
        tabBarStyle: {
          backgroundColor: "#0D0D1E",
          borderTopColor: "#333",
        },
        tabBarActiveTintColor: "#FFD700",
        tabBarInactiveTintColor: "#fff",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet-outline" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="trade"
        options={{
          title: "Trade",
          tabBarIcon: ({ color }) => (
            <Ionicons name="swap-horizontal-outline" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
