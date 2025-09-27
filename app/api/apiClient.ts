// src/api/apiClient.ts
import axios from "axios";
import Constants from "expo-constants";

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string) ||
  "http://192.168.31.119:5000";

const api = axios.create({
  baseURL: API_URL.replace(/\/+$/, ""), // remove trailing slash
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
