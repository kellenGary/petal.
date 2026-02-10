import RingCarousel from "@/components/home/ring-carousel";
import { ThemedText } from '@/components/ui/themed-text';
import { CLIENT_ID, REDIRECT_URI, SCOPES } from "@/constants/auth";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  View
} from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [tracks, setTracks] = useState([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  useEffect(() => {
    const fetchTracks = async () => {
      const response = await api.makeRequest("/api/db/tracks");
      const data = await response.json();
      setTracks(data);
    };
    fetchTracks();
  }, []);

  const handleSpotifyCallback = async (url: string) => {
    if (!url.startsWith(REDIRECT_URI)) return;

    const urlParams = new URL(
      url.replace(`${REDIRECT_URI}?`, "http://dummy.com/?").replace(`${REDIRECT_URI}/?`, "http://dummy.com/?"),
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
      SCOPES,
    )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type === "success" && result.url) {
      await handleSpotifyCallback(result.url);
    }
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const carouselHeight = screenHeight * 0.8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topSection, { height: carouselHeight }]}>
        {tracks.length > 0 && (
          <RingCarousel
            tracks={tracks}
            width={screenWidth}
            height={carouselHeight}
          />
        )}
      </View>

      <View style={styles.loginContent}>
        <View style={styles.contentWrapper}>
          <ThemedText style={styles.subtitle} type="small">
            Connect your Spotify account to discover friends and share music
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogin}
          >
            <LinearGradient
              colors={["#1DB954", "#1ed760"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <ThemedText style={styles.buttonText}>Continue with Spotify</ThemedText>
            </LinearGradient>
          </Pressable>
          <ThemedText style={[styles.footerText, { color: colors.text }]}>
            By continuing, you agree to share your Spotify data
          </ThemedText>
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
    width: "100%",
    paddingTop: 40,
    paddingBottom: 50,
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
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  button: {
    width: "100%",
    maxWidth: 280,
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
    paddingVertical: 12,
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
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
