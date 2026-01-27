import { ThemedText } from '@/components/themed-text';
import { View, Text, ScrollView } from "react-native";
import { FeedListeningSessionPost } from "@/services/feedApi";

export default function SessionPost({
  post,
}: {
  post: FeedListeningSessionPost;
}) {
  return (
    <View>
      <ThemedText style={{ color: "white" }}>
        {post.user.displayName} listened to {post.tracks.length} tracks
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {post.tracks.map((track, index) => (
          <View key={index} style={{ marginRight: 8 }}>
            <ThemedText style={{ color: "white" }}>{track.name}</ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
