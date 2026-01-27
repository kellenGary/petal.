import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ListeningHistoryProvider } from "@/contexts/ListeningHistoryContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { PlaybackProvider } from "@/contexts/playbackContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inProfileSetup = segments[1] === "profile-setup";

    if (!isAuthenticated) {
      // Not authenticated - redirect to sign-in if not already there
      if (!inAuthGroup) {
        router.replace("/(auth)");
      }
    } else {
      // Authenticated
      if (!user?.hasCompletedProfile) {
        // Profile not completed - redirect to setup if not already there
        if (!inProfileSetup) {
          router.replace("/(auth)/profile-setup");
        }
      } else {
        // Profile completed - redirect away from auth group
        if (inAuthGroup) {
          router.replace("/(tabs)");
        }
      }
    }
  }, [isAuthenticated, segments, isLoading, user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="player"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1.0],
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="song/[id]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1.0],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="post-preview"
        options={{
          presentation: "modal",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1.0],
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="artist/[id]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1.0],
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="sotd"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1.0],
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <LocationProvider>
        <PlaybackProvider>
          <ListeningHistoryProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <RootLayoutNav />
              <StatusBar
                style={colorScheme === "dark" ? "light" : "dark"}
                translucent
              />
            </ThemeProvider>
          </ListeningHistoryProvider>
        </PlaybackProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
