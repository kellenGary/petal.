import { CLIENT_ID, REDIRECT_URI, SCOPES } from "@/constants/auth";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn } = useAuth();

  const handleSpotifyCallback = async (url: string) => {
    if (!url.startsWith("mf://callback")) return;

    const urlParams = new URL(
      url.replace("mf://callback/?", "http://dummy.com/?")
    );
    const code = urlParams.searchParams.get("code");
    const state = urlParams.searchParams.get("state");

    if (!code) return;

    try {
      const { token, user } = await api.handleAuthCallback(code, state || "");

      if (token && user) {
        // Just sign in - the root layout will handle routing based on auth state
        await signIn(token, user);
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
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(
      SCOPES
    )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type === "success" && result.url) {
      await handleSpotifyCallback(result.url);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#538ce9ff", "#526ebaff","#6d8adb84", "#000000ff"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topSection}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.icon}
        />
      </View>
      <View style={styles.loginContent}>
        <View style={styles.contentWrapper}>
          <Text style={styles.title}>Welcome to MF</Text>
          <Text style={styles.subtitle}>
            Connect your Spotify account to discover friends and share music
          </Text>
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed
            ]} 
            onPress={handleLogin}
          >
            <LinearGradient
              colors={["#1DB954", "#1ed760"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue with Spotify</Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.footerText}>
            By continuing, you agree to share your Spotify data
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "300",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  loginContent: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(10px)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: "100%",
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  contentWrapper: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    color: "white",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 36,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  button: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 24,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
