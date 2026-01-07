import { API_URL, CLIENT_ID, REDIRECT_URI, SCOPES } from "@/constants/auth";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn } = useAuth();

  const handleSpotifyCallback = async (url: string) => {
    if (!url.startsWith("mf://callback")) return;

    const urlParams = new URL(url.replace("mf://callback/?", "http://dummy.com/?"));
    const code = urlParams.searchParams.get("code");
    const state = urlParams.searchParams.get("state");

    if (!code) return;

    try {
      const response = await fetch(
        `${API_URL}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || "")}`
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.token && data.user) {
        await signIn(data.token, data.user);
        router.replace("/(tabs)");
      } else {
        throw new Error("No token received");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Failed to complete login");
    }
  };

  async function handleLogin() {
    const state = Math.random().toString(36).substring(7);
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type === "success" && result.url) {
      await handleSpotifyCallback(result.url);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to MF</Text>
      <Text style={styles.subtitle}>Connect your Spotify to get started</Text>
      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Sign in with Spotify</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
