import AudioPlayer from "@/components/audio-player";
import { StyleSheet, View } from "react-native";

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
