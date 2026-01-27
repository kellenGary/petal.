import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import postApi, { SelectedContent } from "@/services/postApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PostPreviewScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const params = useLocalSearchParams<{
    type: string;
    id: string;
    spotifyId: string;
    name: string;
    imageUrl: string;
    subtitle: string;
  }>();

  const [caption, setCaption] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const selectedContent: SelectedContent = {
    type: params.type as "song" | "album" | "playlist" | "artist",
    id: params.id,
    spotifyId: params.spotifyId,
    name: params.name,
    imageUrl: params.imageUrl || null,
    subtitle: params.subtitle,
  };

  const getPostTypeLabel = () => {
    switch (selectedContent.type) {
      case "song":
        return "Song";
      case "album":
        return "Album";
      case "playlist":
        return "Playlist";
      case "artist":
        return "Artist";
      default:
        return "Content";
    }
  };

  const handlePost = async () => {
    setIsPosting(true);
    try {
      await postApi.shareContent(
        selectedContent,
        caption.trim() || undefined,
        "Public"
      );
      Alert.alert("Success", "Your post has been shared!", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error) {
      console.error("Failed to post:", error);
      Alert.alert("Error", "Failed to share your post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, {backgroundColor: colors.background}]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Share {getPostTypeLabel()}
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* Preview Card */}
        <View style={[styles.previewCard]}>
          <Image
            source={{ uri: selectedContent.imageUrl || undefined }}
            style={styles.previewImage}
            placeholder={require("@/assets/images/icon.png")}
          />
          <View style={styles.previewInfo}>
            <ThemedText style={[styles.previewName, { color: colors.text }]} numberOfLines={2}>
              {selectedContent.name}
            </ThemedText>
            <ThemedText style={[styles.previewSubtitle, { color: colors.text, opacity: 0.7 }]} numberOfLines={1}>
              {selectedContent.subtitle}
            </ThemedText>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + "30" }]}>
              <ThemedText style={[styles.typeBadgeText, { color: colors.primary }]}>
                {getPostTypeLabel()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Caption Input */}
        <View style={styles.captionSection}>
          <ThemedText style={[styles.captionLabel, { color: colors.text }]}>
            Add a caption (optional)
          </ThemedText>
          <TextInput
            style={[
              styles.captionInput,
              {
                color: colors.text,
                backgroundColor: colors.card,
                borderColor: isDark ? "#333" : "#ddd",
              },
            ]}
            placeholder="What's on your mind about this?"
            placeholderTextColor={colors.icon}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={280}
            textAlignVertical="top"
          />
          <ThemedText style={[styles.charCount, { color: colors.icon }]}>
            {caption.length}/280
          </ThemedText>
        </View>

        {/* Post Button */}
        <Pressable
          style={[
            styles.postButton,
            { backgroundColor: colors.primary },
            isPosting && styles.postButtonDisabled,
          ]}
          onPress={handlePost}
          disabled={isPosting}
        >
          {isPosting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="white" />
              <ThemedText style={styles.postButtonText}>Post</ThemedText>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  previewCard: {
    flexDirection: "row",
    borderRadius: 12,
    gap: 16,
    marginBottom: 24,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  previewInfo: {
    flex: 1,
    justifyContent: "center",
  },
  previewName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  captionSection: {
    marginBottom: 24,
  },
  captionLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
  },
  charCount: {
    textAlign: "right",
    marginTop: 8,
    fontSize: 12,
  },
  postButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  postButtonDisabled: {
    opacity: 0.7,
  },
  postButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
