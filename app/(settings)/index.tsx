import { ThemedText } from '@/components/themed-text';
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RelativePathString, router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  SettingsRow,
  SettingsSection,
  SettingsSwitch,
} from "@/components/settings";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import profileApi from "@/services/profileApi";

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  // Toggle states (placeholders for future implementation)
  const [pushNotifications, setPushNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)");
          },
        },
      ],
      { cancelable: true },
    );
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data, including your listening history, posts, and followers will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            // Second confirmation
            Alert.alert(
              "Are you absolutely sure?",
              "Type 'DELETE' to confirm you want to permanently delete your account.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "I understand, delete my account",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setIsDeleting(true);
                      await profileApi.deleteAccount();
                      await signOut();
                      router.replace("/(auth)");
                    } catch (error) {
                      console.error("Failed to delete account:", error);
                      Alert.alert(
                        "Error",
                        "Failed to delete account. Please try again or contact support.",
                      );
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
      { cancelable: true },
    );
  }, [signOut]);

  const handleEditProfile = useCallback(() => {
    router.push("/profile-editor" as RelativePathString);
  }, []);

  const openURL = useCallback((url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err),
    );
  }, []);

  const openEmail = useCallback(() => {
    Linking.openURL("mailto:support@mfapp.com?subject=Support%20Request").catch(
      (err) => console.error("Failed to open email:", err),
    );
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
        </Pressable>
        <ThemedText style={[styles.title, { color: colors.text }]}>Settings</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsRow
            icon="person"
            iconColor="#5856D6"
            label="Edit Profile"
            sublabel={user?.displayName ?? user?.handle ?? undefined}
            onPress={handleEditProfile}
          />
          <SettingsRow
            icon="music-note"
            iconColor="#1DB954"
            label="Connected Accounts"
            sublabel="Spotify"
            onPress={() => { }}
            isLast
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection
          title="Preferences"
          footer="Private accounts hide your listening activity from other users."
        >
          <SettingsSwitch
            icon="notifications"
            iconColor="#FF9500"
            label="Push Notifications"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          <SettingsRow
            icon="palette"
            iconColor="#AF52DE"
            label="Appearance"
            sublabel={isDark ? "Dark" : "Light"}
            showChevron
            onPress={() => {
              // TODO: Implement appearance picker
            }}
          />
          <SettingsSwitch
            icon="lock"
            iconColor="#8E8E93"
            label="Private Account"
            value={privateAccount}
            onValueChange={setPrivateAccount}
            isLast
          />
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title="Support">
          <SettingsRow
            icon="help"
            iconColor="#34C759"
            label="Help & FAQ"
            onPress={() => openURL("https://mfapp.com/help")}
          />
          <SettingsRow
            icon="email"
            iconColor="#007AFF"
            label="Contact Support"
            onPress={openEmail}
          />
          <SettingsRow
            icon="flag"
            iconColor="#FF9500"
            label="Report a Problem"
            onPress={() => openURL("https://mfapp.com/report")}
            isLast
          />
        </SettingsSection>

        {/* Legal Section */}
        <SettingsSection title="Legal">
          <SettingsRow
            icon="privacy-tip"
            iconColor="#5AC8FA"
            label="Privacy Policy"
            onPress={() => openURL("https://mfapp.com/privacy")}
          />
          <SettingsRow
            icon="description"
            iconColor="#5AC8FA"
            label="Terms of Service"
            onPress={() => openURL("https://mfapp.com/terms")}
            isLast
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <SettingsRow
            icon="logout"
            iconColor="#FF3B30"
            label="Sign Out"
            destructive
            onPress={handleSignOut}
          />
          <SettingsRow
            icon="delete-forever"
            iconColor="#FF3B30"
            label="Delete Account"
            sublabel="Permanently delete your account and data"
            destructive
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            isLast
          />
        </SettingsSection>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: colors.icon }]}>
            Petal App v1.0.0
          </ThemedText>
        </View>

        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 13,
  },
});
