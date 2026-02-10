import AudioPlayer from "@/components/ui/audio-player";
import { StyleSheet, View, Text } from "react-native";

export default function PlayerModal() {
  return (
    <View style={styles.container}>
      <AudioPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
