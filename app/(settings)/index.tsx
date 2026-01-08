import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function SettingsPage() {
  const { signOut } = useAuth();

  const handleSignout = async () => {
    await signOut();
    // Ensure we can't navigate back to a protected screen
    router.replace("/(auth)");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings Page</Text>
      {/* Add your settings components here */}
      <Pressable style={styles.logoutButton} onPress={() => handleSignout()}>
        <Text style={{ color: "#fff" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  logoutButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#ff4444",
    borderRadius: 5,
  },

});
