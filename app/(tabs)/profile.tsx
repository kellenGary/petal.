import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '@/constants/auth';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabType = 'history' | 'playlists' | 'liked';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<TabType>('history');

  const colors = Colors[isDark ? 'dark' : 'light'];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderSongItem = (item: { id: string; title: string; artist: string; cover: string }) => (
    <Pressable key={item.id} style={styles.songItem}>
      <Image source={{ uri: item.cover }} style={styles.songCover} />
      <View style={styles.songInfo}>
        <ThemedText style={styles.songTitle} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={styles.songArtist} numberOfLines={1}>{item.artist}</ThemedText>
      </View>
      <MaterialIcons name="play-circle-outline" size={28} color={colors.icon} />
    </Pressable>
  );

  const renderPlaylistItem = (item: { id: string; name: string; songCount: number; cover: string }) => (
    <Pressable key={item.id} style={styles.playlistItem}>
      <Image source={{ uri: item.cover }} style={styles.playlistCover} />
      <View style={styles.playlistInfo}>
        <ThemedText style={styles.playlistName} numberOfLines={1}>{item.name}</ThemedText>
        <ThemedText style={styles.playlistCount}>{item.songCount} songs</ThemedText>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
    </Pressable>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'history':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Recently Played</ThemedText>
          </View>
        );
      case 'playlists':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Your Playlists</ThemedText>
          </View>
        );
      case 'liked':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Liked Songs</ThemedText>
          </View>
        );
    }
  };

  useEffect(() => {
    // Optionally, fetch real user data from Spotify API here
    const fetchProfileData = async () => {
      const response = await fetch(`${API_URL}/profile`)
    }
    fetchProfileData();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          {/* Settings Button */}
          <View style={styles.headerActions}>
            <View style={styles.spacer} />
            <Pressable style={styles.settingsButton}>
              <MaterialIcons name="settings" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Profile Picture */}
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: '' }}
              style={styles.profileImage}
            />
          </View>

          {/* Name & Username */}
          <ThemedText style={styles.profileName} lightColor="#fff" darkColor="#fff">
            kellen
          </ThemedText>
          <ThemedText style={styles.username} lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
            kellen
          </ThemedText>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <Pressable style={styles.statItem}>
              <ThemedText style={styles.statNumber} lightColor="#fff" darkColor="#fff">
                {formatNumber(0)}
              </ThemedText>
              <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
                Followers
              </ThemedText>
            </Pressable>
            <Pressable style={styles.statItem}>
              <ThemedText style={styles.statNumber} lightColor="#fff" darkColor="#fff">
                {formatNumber(0)}
              </ThemedText>
              <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
                Following
              </ThemedText>
            </Pressable>
            <Pressable style={styles.statItem}>
              <ThemedText style={styles.statNumber} lightColor="#fff" darkColor="#fff">
                {formatNumber(0)}
              </ThemedText>
              <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
                Unique Songs
              </ThemedText>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
          <Pressable
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'history' && styles.activeTabText,
              ]}
            >
              History
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
            onPress={() => setActiveTab('playlists')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'playlists' && styles.activeTabText,
              ]}
            >
              Playlists
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
            onPress={() => setActiveTab('liked')}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'liked' && styles.activeTabText,
              ]}
            >
              Liked
            </ThemedText>
          </Pressable>
        </View>

        {/* Content Section */}
        <ThemedView style={styles.contentContainer}>
          {renderContent()}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  spacer: {
    width: 40,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    marginBottom: 4,
    color: "black",
  },
  username: {
    fontSize: 14,
    marginBottom: 20,
    color: "black"
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    color: "black"
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    color: "black"
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1DB954',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1DB954',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    minHeight: 400,
  },
  contentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    marginBottom: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  songCover: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 13,
    opacity: 0.7,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  playlistCount: {
    fontSize: 13,
    opacity: 0.7,
  },
});
