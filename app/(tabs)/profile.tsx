import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

interface ReferredUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [referralCode, setReferralCode] = useState<string>("");
  const [tempReferralCode, setTempReferralCode] = useState<string>("");
  const [referredCount, setReferredCount] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showReferredUsers, setShowReferredUsers] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData?.session?.user) {
        router.replace("/(auth)/signin");
        return;
      }

      const currentUser = sessionData.session.user;
      setUser(currentUser);
      const userEmail = currentUser.email || "";
      setEmail(userEmail);
      setOriginalEmail(userEmail);

      // Fetch user's detailed profile from users table
      const { data: userProfile, error: userProfileError } = await supabase
        .from("users")
        .select("id, full_name, phone, email")
        .eq("auth_id", currentUser.id)
        .single();

      if (userProfileError) {
        console.error("User profile error:", userProfileError);
        Alert.alert("Error", "Failed to load user profile");
        return;
      }

      if (userProfile) {
        setUserId(userProfile.id);
        setFullName(userProfile.full_name || "");
        setPhone(userProfile.phone || "");
        setEmail(userProfile.email || userEmail);
        setOriginalEmail(userProfile.email || userEmail);
      }

      // Fetch referral information using the internal user ID
      const { data: refData, error: refError } = await supabase
        .from("referrals")
        .select(
          "referral_code, referred_count, points, total_rewards, earnings"
        )
        .eq("user_id", userProfile.id)
        .single();

      if (refError || !refData) {
        Alert.alert("Error", "Failed to load referral data");
        return;
      } else {
        setReferralCode(refData.referral_code || "");
        setTempReferralCode(refData.referral_code || "");
        setReferredCount(refData.referred_count || 0);
        setPoints(refData.points || 0);
        setTotalEarnings(refData.total_rewards || refData.earnings || 0);
      }

      // Fetch referred users list using referral_history
      const { data: referredData, error: referredError } = await supabase
        .from("referral_history")
        .select(
          `
          referred_id,
          created_at,
          users!referred_id (
            full_name,
            email
          )
        `
        )
        .eq("referrer_id", userProfile.id)
        .order("created_at", { ascending: false });

      if (referredError) {
        console.error("Referred users error:", referredError);
      } else if (referredData) {
        const formattedReferredUsers = referredData.map((item: any) => ({
          id: item.referred_id,
          full_name: (item.users as any)?.full_name || "Unknown",
          email: (item.users as any)?.email || "Unknown",
          created_at: item.created_at,
        }));
        setReferredUsers(formattedReferredUsers);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferral = async () => {
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      Alert.alert(
        "Copied!",
        `Referral code "${referralCode}" copied to clipboard.`
      );
    } else {
      Alert.alert("Error", "No referral code available to copy.");
    }
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert("Error", "User ID not found");
      return;
    }

    // Validate referral code
    if (isEditing && tempReferralCode) {
      if (tempReferralCode.length < 8) {
        Alert.alert("Error", "Referral code must be exactly 8 characters");
        return;
      }

      // Check for uniqueness of referral code
      const { data: existingReferral, error: checkError } = await supabase
        .from("referrals")
        .select("referral_code")
        .eq("referral_code", tempReferralCode.toUpperCase())
        .neq("user_id", userId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking referral code:", checkError);
        Alert.alert("Error", "Failed to validate referral code");
        return;
      }

      if (existingReferral) {
        Alert.alert("Error", "This referral code is already in use");
        return;
      }
    }

    setLoading(true);
    try {
      const emailChanged = email.toLowerCase() !== originalEmail.toLowerCase();

      // Update auth user
      const updateData: any = {
        data: { full_name: fullName, phone },
      };

      // Only add email if it changed
      if (emailChanged) {
        updateData.email = email.toLowerCase();
      }

      const { error: authError } = await supabase.auth.updateUser(updateData);

      if (authError) {
        Alert.alert("Error", authError.message);
        setLoading(false);
        return;
      }

      // Update users table
      const { error: usersError } = await supabase
        .from("users")
        .update({
          email: email.toLowerCase(),
          full_name: fullName,
          phone,
        })
        .eq("id", userId);

      if (usersError) {
        console.error("Users table update error:", usersError);
        Alert.alert("Error", "Failed to update profile in database");
        setLoading(false);
        return;
      }

      // Update referral code if changed
      if (isEditing && tempReferralCode !== referralCode) {
        const { error: referralError } = await supabase
          .from("referrals")
          .update({ referral_code: tempReferralCode.toUpperCase() })
          .eq("user_id", userId);

        if (referralError) {
          console.error("Referral code update error:", referralError);
          Alert.alert("Error", "Failed to update referral code");
          setLoading(false);
          return;
        }
        setReferralCode(tempReferralCode.toUpperCase());
      }

      if (emailChanged) {
        Alert.alert(
          "Success",
          "Profile updated! Please check your new email address to confirm the change. You'll need to verify the new email before it takes effect.",
          [
            {
              text: "OK",
              onPress: async () => {
                await supabase.auth.signOut();
                router.replace("/(auth)/signin");
              },
            },
          ]
        );
      } else {
        Alert.alert("Success", "Profile updated successfully!");
        setIsEditing(false);
        setOriginalEmail(email.toLowerCase());
      }
    } catch (err) {
      console.error("Profile update error:", err);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/signin");
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data including trades, wallet balance, and referral history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) {
              Alert.alert("Error", "No user found.");
              return;
            }

            setLoading(true);

            try {
              // Call delete function via RPC
              const { error: rpcError } = await supabase.rpc(
                "delete_user_completely",
                {
                  p_auth_id: user.id,
                }
              );

              if (rpcError) {
                console.error("Error deleting user:", rpcError);
                Alert.alert(
                  "Error",
                  "Failed to delete account: " + rpcError.message
                );
                setLoading(false);
                return;
              }

              // Sign out (session will be invalid anyway)
              await supabase.auth.signOut();

              Alert.alert(
                "Account Deleted",
                "Your account has been permanently deleted.",
                [
                  {
                    text: "OK",
                    onPress: () => router.replace("/(auth)/signin"),
                  },
                ]
              );
            } catch (error) {
              console.error("Delete account error:", error);
              Alert.alert("Error", "An unexpected error occurred.");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderReferredUser = ({ item }: { item: ReferredUser }) => (
    <View style={styles.referredUserItem}>
      <View style={styles.referredUserInfo}>
        <Text style={styles.referredUserName}>{item.full_name}</Text>
        <Text style={styles.referredUserEmail}>{item.email}</Text>
        <Text style={styles.referredUserDate}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.referredUserReward}>
        <Text style={styles.rewardText}>+100 pts</Text>
        <Text style={styles.rewardAmount}>+₹10</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={styles.profileSection}>
        <Ionicons
          name="person-circle"
          size={80}
          color="#FFD700"
          style={styles.profileIcon}
        />
        <Text style={styles.nameText}>{fullName || email || "User"}</Text>

        {/* Basic Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Basic Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>{fullName || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.value}>{email || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Mobile:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter 10-digit phone number"
                placeholderTextColor="#999"
                maxLength={10}
              />
            ) : (
              <Text style={styles.value}>{phone || "Not provided"}</Text>
            )}
          </View>
        </View>

        {/* Referral Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Referral Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Your Code:</Text>
            {isEditing ? (
              <View style={styles.referralCodeContainer}>
                <TextInput
                  style={styles.input}
                  value={tempReferralCode}
                  onChangeText={(text) =>
                    setTempReferralCode(text.toUpperCase())
                  }
                  placeholder="8 characters"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>
            ) : (
              <View style={styles.referralCodeContainer}>
                <Text style={styles.referralCodeText}>
                  {referralCode || "Loading..."}
                </Text>
                {referralCode && (
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyReferral}
                  >
                    <Ionicons name="copy-outline" size={18} color="#FFD700" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Referrals:</Text>
            <Text style={styles.value}>{referredCount}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Points:</Text>
            <Text
              style={[styles.value, { color: "#4CAF50", fontWeight: "600" }]}
            >
              {points}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Total Earned:</Text>
            <Text
              style={[styles.value, { color: "#4CAF50", fontWeight: "600" }]}
            >
              ₹{totalEarnings.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.showReferralsButton}
            onPress={() => setShowReferredUsers(!showReferredUsers)}
          >
            <Text style={styles.showReferralsText}>
              {showReferredUsers ? "Hide" : "Show"} Referred Users (
              {referredUsers.length})
            </Text>
            <Ionicons
              name={showReferredUsers ? "chevron-up" : "chevron-down"}
              size={20}
              color="#FFD700"
            />
          </TouchableOpacity>
        </View>

        {/* Referred Users List */}
        {showReferredUsers && referredUsers.length > 0 && (
          <View style={styles.referredUsersCard}>
            <Text style={styles.cardTitle}>Your Referrals</Text>
            <FlatList
              data={referredUsers}
              renderItem={renderReferredUser}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        {showReferredUsers && referredUsers.length === 0 && (
          <View style={styles.referredUsersCard}>
            <Text style={styles.cardTitle}>Your Referrals</Text>
            <Text style={styles.emptyText}>
              No referrals yet. Share your referral code to start earning
              rewards!
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.actionText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false);
                setTempReferralCode(referralCode);
                fetchProfile();
              }}
            >
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setIsEditing(true);
              setTempReferralCode(referralCode);
            }}
          >
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.actionText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.actionText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
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
  loadingText: { color: "#FFD700", marginTop: 12, fontSize: 16 },
  profileSection: { alignItems: "center" },
  profileIcon: { marginBottom: 10 },
  nameText: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  referredUsersCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    marginBottom: 20,
    maxHeight: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    alignItems: "center",
  },
  label: { color: "#555", fontSize: 16, width: 120, fontWeight: "500" },
  value: { color: "#333", fontSize: 16, flex: 1, textAlign: "right" },
  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    flex: 1,
    padding: 8,
    fontSize: 16,
    textAlign: "right",
    color: "#333",
  },
  referralCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  referralCodeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
    marginRight: 8,
  },
  copyButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  showReferralsButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 10,
  },
  showReferralsText: {
    color: "#FFD700",
    fontWeight: "600",
    marginRight: 8,
    fontSize: 16,
  },
  referredUserItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  referredUserInfo: {
    flex: 1,
  },
  referredUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  referredUserEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  referredUserDate: {
    fontSize: 12,
    color: "#999",
  },
  referredUserReward: {
    alignItems: "flex-end",
  },
  rewardText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    fontStyle: "italic",
    paddingVertical: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 20,
  },
  editButton: {
    backgroundColor: "#1E90FF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: "100%",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#ff4444",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
