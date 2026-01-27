import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import profileApi from "@/services/profileApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileEditor() {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  // Local editable copy of profile fields
  const [displayName, setDisplayName] = useState<string>(
    user?.displayName ?? "",
  );
  const [handle, setHandle] = useState<string>(user?.handle ?? "");
  const [bio, setBio] = useState<string>(user?.bio ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState<string>(
    user?.profileImageUrl ?? "",
  );

  const [error, setError] = useState<string | null>(null);

  const handleExists = async (handleToCheck: string) => {
    try {
      return await profileApi.checkHandleExists(handleToCheck);
    } catch (e) {
      console.error("Failed to check handle existence:", e);
      return false;
    }
  };

  // Sync with auth user if it changes
  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setHandle(user?.handle ?? "");
    setBio(user?.bio ?? "");
    setProfileImageUrl(user?.profileImageUrl ?? "");
  }, [user]);

  const onCancel = useCallback(() => {
    router.back();
  }, []);

  const onSave = useCallback(async () => {
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    if (!handle.trim()) {
      setError("Handle cannot be empty.");
      return;
    }

    if (await handleExists(handle)) {
      setError("Handle is already taken.");
      return;
    }

    setError(null);
    try {
      const payload: any = { displayName, handle, bio, profileImageUrl };
      const updated = await profileApi.updateAppProfile(payload);
      if (updated && typeof updateUser === "function") {
        // If the API returns updated user object, merge it into auth
        try {
          await updateUser(updated as any);
        } catch {}
      }
    } catch (e) {
      console.error("Failed to save profile:", e);
      setError("Failed to save profile. Please try again.");
    }
    router.back();
  }, [displayName, handle, bio, updateUser, profileImageUrl]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
        </Pressable>
        <ThemedText style={[styles.title, { color: colors.text }]}>Edit Profile</ThemedText>
        <View style={styles.headerRight}>
          <Pressable
            onPress={onSave}
            style={[styles.saveButton, { backgroundColor: colors.card }]}
          >
            <ThemedText style={[styles.saveText, { color: Colors.light.text }]}>
              Save
            </ThemedText>
          </Pressable>
        </View>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={{ color: "#cc0000", textAlign: "center" }}>{error}</ThemedText>
        </View>
      )}

      <ScrollView style={styles.form}>
        {/* Live Preview with edit-button overlay */}
        <View style={[styles.previewCard]}>
          <View style={styles.previewHeader}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileImageUrl || user?.profileImageUrl || "" }}
                style={styles.profileImage}
              />
            </View>
            <View style={styles.previewText}>
              <ThemedText style={[styles.profileName, { color: colors.text }]}>
                {displayName || user?.displayName || "Your Name"}
              </ThemedText>
              <ThemedText style={[styles.handleText, { color: colors.text }]}>
                @{handle || user?.handle || "handle"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.field}>
          <Pressable
            style={[
              styles.editPictureButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={async () => {
              // ask permission and open image picker
              const perm =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (perm.status !== "granted") return;
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
                aspect: [1, 1],
              });
              if (!result.canceled) {
                const uri =
                  result.uri ?? (result.assets && result.assets[0]?.uri);
                if (uri) setProfileImageUrl(uri);
              }
            }}
          >
            <MaterialIcons
              name="edit"
              size={16}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <ThemedText style={[styles.editPictureText, { color: "#fff" }]}>
              Edit picture
            </ThemedText>
          </Pressable>
          <View>
            <ThemedText style={[styles.label, { color: colors.text }]}>
              Display name
            </ThemedText>
            <TextInput
              value={displayName || ""}
              onChangeText={setDisplayName}
              placeholder="Display name"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
              placeholderTextColor={
                isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"
              }
            />
          </View>

          <View>
            <ThemedText style={[styles.label, { color: colors.text }]}>Handle</ThemedText>
            <TextInput
              value={handle || ""}
              onChangeText={setHandle}
              placeholder="Handle"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
              placeholderTextColor={
                isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"
              }
            />
          </View>

          <View>
            <ThemedText style={[styles.label, { color: colors.text }]}>Bio</ThemedText>
            <TextInput
              value={bio || ""}
              onChangeText={setBio}
              placeholder="Bio"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
              placeholderTextColor={
                isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"
              }
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#ffe6e6",
    padding: 10,
    marginTop: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
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
    width: 64,
    alignItems: "flex-end",
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  saveText: {
    fontWeight: "600",
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  previewCard: {
    borderRadius: 12,
    paddingVertical: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImageContainer: {
    marginRight: 12,
    position: "relative",
  },
  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 12,
  },
  editPictureButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: "auto",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  editPictureText: {
    fontSize: 12,
    fontWeight: "600",
  },
  previewText: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
  },
  handleText: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  field: {
    marginBottom: 12,
    gap: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
