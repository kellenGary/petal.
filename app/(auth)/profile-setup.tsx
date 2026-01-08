import { useAuth } from "@/contexts/AuthContext";
import api, { User } from "@/services/api";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface SpotifyProfile {
  display_name?: string;
  email?: string;
  images?: { url: string }[];
  id: string;
}

export default function ProfileSetupScreen() {
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appProfile, setAppProfile] = useState<User | null>(null);
  const [spotifyProfile, setSpotifyProfile] = useState<SpotifyProfile | null>(
    null
  );

  const [displayName, setDisplayName] = useState<string>("");
  const [handle, setHandle] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [sp, ap] = await Promise.all([
          api.getProfile(),
          api.getAppProfile(),
        ]);
        setSpotifyProfile(sp);
        setAppProfile(ap);

        const defaultDisplay = ap?.displayName ?? sp?.display_name ?? "";
        const defaultHandle =
          ap?.handle ??
          (sp?.display_name
            ? `@${sp.display_name.replace(/\s+/g, "").toLowerCase()}`
            : "");
        setDisplayName(defaultDisplay);
        setHandle(defaultHandle);
        setBio(ap?.bio ?? "");
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    try {
      const payload = { displayName, handle, bio };
      const updated = await api.updateAppProfile(payload);
      if (updated) {
        // Update the user in auth context so routing works
        await updateUser(updated);
        Alert.alert("Profile updated", "Welcome!");
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Please try again");
    }
  }

  const profileImage =
    spotifyProfile?.images?.[0]?.url ??
    appProfile?.profileImageUrl ??
    undefined;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          We prefilled info from Spotify. Make it yours.
        </Text>

        {profileImage && (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Handle</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            placeholder="@yourname"
          />
          <Text style={styles.help}>
            Handles must be unique; you can change later.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Tell us about your music taste"
          />
        </View>

        <Pressable style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Save and Continue</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textarea: { height: 96, textAlignVertical: "top" },
  help: { fontSize: 12, color: "#888", marginTop: 6 },
  button: {
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
