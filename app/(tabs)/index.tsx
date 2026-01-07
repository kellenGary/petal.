import SongItem from "@/components/song-item";
import { API_URL } from "@/constants/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView from "react-native-maps";

export default function HomeScreen() {
  const { jwtToken } = useAuth();

  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const fetchRecommendedTracks = async () => {
      if (!jwtToken) return;

      try {
        const response = await fetch(`${API_URL}/api/spotify/new-releases`, {
          method: "GET",
          headers: { Authorization: `Bearer ${jwtToken}` },
        });
        
        console.log("Response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error:", errorText);
          return;
        }
        
        const data = await response.json();
        setRecommendations(data.albums);
      } catch (error) {
        console.error("Error fetching recommended tracks:", error);
      }

    }
    console.log("Access Token:", jwtToken);
    fetchRecommendedTracks();
  }, [jwtToken]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#ffffffff", "#ffffffff", "#e8e8e8ff", "#ffffffff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.containerGradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.headerGradient}>
            {/* Hero Header */}
            <View style={styles.headerContainer}>
              <Image
                source={require("../../assets/images/black-icon.png")}
                style={styles.headerImage}
              />
              <Text style={styles.headerText}>Welcome Kellen</Text>
            </View>

            <View style={styles.headerContentContainer}>
              {/* Map Section */}
              <MapView style={styles.map} />

              {/* Live Listeners Section */}
              <View style={styles.activeContainer}>
                <Text style={styles.activeHeaderText}>Listening Now</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.activeScrollView}
                  contentContainerStyle={styles.activeScrollContent}
                >
                  <View style={styles.listenerCard}>
                    <View style={styles.songBubble}>
                      <Text style={styles.songName} numberOfLines={2}>
                        songName
                      </Text>
                    </View>
                    <View style={styles.profileImageContainer}>
                      <Image
                        source={{ uri: "https://i.pravatar.cc/300?img=12" }}
                        style={styles.profileImage}
                      />
                    </View>
                    <Text style={styles.username}>Name</Text>
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
          <View>
            <Text>New Releases</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activeScrollView}
              contentContainerStyle={styles.activeScrollContent}
            >
              {recommendations.map((album: any) => (
                <SongItem 
                  key={album.id}
                  id={album.id}
                  title={album.name}
                  artist={album.artists.map((artist: any) => artist.name).join(', ')}
                  cover={album.images[0]?.url || ''}
                  link={album.external_urls.spotify}
                />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    width: "100%",
    minHeight: Dimensions.get("window").height,
    gap: 32,
  },
  headerContainer: {
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 32,
  },
  headerImage: {
    width: 96,
    height: 96,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "600",
    color: "black",
  },
  headerContentContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  map: {
    height: 240,
    width: "100%",
    borderRadius: 16,
  },
  activeContainer: {
    width: "100%",
  },
  activeHeaderText: {
    fontSize: 16,
    fontWeight: "500",
    color: "black",
    marginBottom: 12,
  },
  activeScrollView: {
    width: "100%",
  },
  activeScrollContent: {
    gap: 16,
    paddingVertical: 8,
  },
  listenerCard: {
    alignItems: "center",
  },
  songBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 120,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: -12,
    zIndex: 1,
  },
  songName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  profileImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#667eea",
    padding: 2,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  username: {
    fontSize: 12,
    fontWeight: "500",
    color: "black",
    textAlign: "center",
    marginTop: 8,
  },
});
