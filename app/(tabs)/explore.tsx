import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Mock data for explore sections
const mockGenres = [
  { id: '1', name: 'Pop', color: '#E91E63', icon: 'music-note' as const },
  { id: '2', name: 'Hip Hop', color: '#9C27B0', icon: 'album' as const },
  { id: '3', name: 'Rock', color: '#F44336', icon: 'electric-bolt' as const },
  { id: '4', name: 'Electronic', color: '#00BCD4', icon: 'graphic-eq' as const },
  { id: '5', name: 'R&B', color: '#FF9800', icon: 'nightlife' as const },
  { id: '6', name: 'Indie', color: '#4CAF50', icon: 'headphones' as const },
];

const mockTrendingSongs = [
  { id: '1', title: 'Espresso', artist: 'Sabrina Carpenter', plays: '2.3M', cover: 'https://picsum.photos/seed/trend1/100' },
  { id: '2', title: 'Not Like Us', artist: 'Kendrick Lamar', plays: '1.8M', cover: 'https://picsum.photos/seed/trend2/100' },
  { id: '3', title: 'Birds of a Feather', artist: 'Billie Eilish', plays: '1.5M', cover: 'https://picsum.photos/seed/trend3/100' },
  { id: '4', title: 'Good Luck, Babe!', artist: 'Chappell Roan', plays: '1.2M', cover: 'https://picsum.photos/seed/trend4/100' },
];

const mockFeaturedPlaylists = [
  { id: '1', name: 'Today\'s Top Hits', description: 'The hottest tracks right now', cover: 'https://picsum.photos/seed/featured1/200' },
  { id: '2', name: 'Discover Weekly', description: 'Your personal mixtape', cover: 'https://picsum.photos/seed/featured2/200' },
  { id: '3', name: 'Chill Hits', description: 'Kick back to the best new music', cover: 'https://picsum.photos/seed/featured3/200' },
];

const mockNearbyUsers = [
  { id: '1', name: 'Sarah M.', username: '@sarahm', avatar: 'https://i.pravatar.cc/100?img=1', topArtist: 'Taylor Swift' },
  { id: '2', name: 'Mike R.', username: '@miker', avatar: 'https://i.pravatar.cc/100?img=2', topArtist: 'Drake' },
  { id: '3', name: 'Emma L.', username: '@emmal', avatar: 'https://i.pravatar.cc/100?img=3', topArtist: 'The Weeknd' },
  { id: '4', name: 'James K.', username: '@jamesk', avatar: 'https://i.pravatar.cc/100?img=4', topArtist: 'Billie Eilish' },
];

type TabType = 'forYou' | 'trending' | 'nearby';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<TabType>('forYou');
  const [searchQuery, setSearchQuery] = useState('');

  const colors = Colors[isDark ? 'dark' : 'light'];

  const renderGenreCard = (item: { id: string; name: string; color: string; icon: 'music-note' | 'album' | 'electric-bolt' | 'graphic-eq' | 'nightlife' | 'headphones' }) => (
    <Pressable key={item.id} style={[styles.genreCard, { backgroundColor: item.color }]}>
      <MaterialIcons name={item.icon} size={28} color="#fff" />
      <ThemedText style={styles.genreName} lightColor="#fff" darkColor="#fff">
        {item.name}
      </ThemedText>
    </Pressable>
  );

  const renderTrendingSong = (item: { id: string; title: string; artist: string; plays: string; cover: string }, index: number) => (
    <Pressable key={item.id} style={styles.trendingItem}>
      <ThemedText style={styles.trendingRank}>{index + 1}</ThemedText>
      <Image source={{ uri: item.cover }} style={styles.trendingCover} />
      <View style={styles.trendingInfo}>
        <ThemedText style={styles.trendingTitle} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={styles.trendingArtist} numberOfLines={1}>{item.artist}</ThemedText>
      </View>
      <View style={styles.playsContainer}>
        <MaterialIcons name="play-arrow" size={14} color={colors.icon} />
        <ThemedText style={styles.playsCount}>{item.plays}</ThemedText>
      </View>
    </Pressable>
  );

  const renderFeaturedPlaylist = (item: { id: string; name: string; description: string; cover: string }) => (
    <Pressable 
      key={item.id} 
      style={styles.featuredCard}
      onPress={() => router.push(`/playlist/${item.id}`)}
    >
      <Image source={{ uri: item.cover }} style={styles.featuredCover} />
      <ThemedText style={styles.featuredName} numberOfLines={1}>{item.name}</ThemedText>
      <ThemedText style={styles.featuredDescription} numberOfLines={2}>{item.description}</ThemedText>
    </Pressable>
  );

  const renderNearbyUser = (item: { id: string; name: string; username: string; avatar: string; topArtist: string }) => (
    <Pressable key={item.id} style={styles.userCard}>
      <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
      <ThemedText style={styles.userName} numberOfLines={1}>{item.name}</ThemedText>
      <ThemedText style={styles.userUsername} numberOfLines={1}>{item.username}</ThemedText>
      <View style={styles.userTopArtist}>
        <MaterialIcons name="headphones" size={12} color="#1DB954" />
        <ThemedText style={styles.topArtistText} numberOfLines={1}>{item.topArtist}</ThemedText>
      </View>
    </Pressable>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'forYou':
        return (
          <View style={styles.contentSection}>
            {/* Genres */}
            <ThemedText style={styles.sectionTitle}>Browse by Genre</ThemedText>
            <View style={styles.genreGrid}>
              {mockGenres.map(renderGenreCard)}
            </View>

            {/* Featured Playlists */}
            <ThemedText style={styles.sectionTitle}>Featured Playlists</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {mockFeaturedPlaylists.map(renderFeaturedPlaylist)}
            </ScrollView>
          </View>
        );
      case 'trending':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Top Songs This Week</ThemedText>
            {mockTrendingSongs.map((song, index) => renderTrendingSong(song, index))}
          </View>
        );
      case 'nearby':
        return (
          <View style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Music Lovers Nearby</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Discover people with similar taste</ThemedText>
            <View style={styles.userGrid}>
              {mockNearbyUsers.map(renderNearbyUser)}
            </View>
          </View>
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#1DB954', '#191414']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          {/* Header Title */}
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle} lightColor="#fff" darkColor="#fff">
              Explore
            </ThemedText>
            <Pressable style={styles.filterButton}>
              <MaterialIcons name="tune" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={22} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs, artists, or users..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.quickStat}>
              <MaterialIcons name="trending-up" size={20} color="#fff" />
              <ThemedText style={styles.quickStatText} lightColor="#fff" darkColor="#fff">
                50+ Trending
              </ThemedText>
            </View>
            <View style={styles.quickStat}>
              <MaterialIcons name="people" size={20} color="#fff" />
              <ThemedText style={styles.quickStatText} lightColor="#fff" darkColor="#fff">
                1.2K Nearby
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
          <Pressable
            style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
            onPress={() => setActiveTab('forYou')}
          >
            <MaterialIcons
              name="auto-awesome"
              size={24}
              color={activeTab === 'forYou' ? '#1DB954' : colors.icon}
            />
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'forYou' && styles.activeTabText,
              ]}
            >
              For You
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
            onPress={() => setActiveTab('trending')}
          >
            <MaterialIcons
              name="trending-up"
              size={24}
              color={activeTab === 'trending' ? '#1DB954' : colors.icon}
            />
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'trending' && styles.activeTabText,
              ]}
            >
              Trending
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'nearby' && styles.activeTab]}
            onPress={() => setActiveTab('nearby')}
          >
            <MaterialIcons
              name="location-on"
              size={24}
              color={activeTab === 'nearby' ? '#1DB954' : colors.icon}
            />
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'nearby' && styles.activeTabText,
              ]}
            >
              Nearby
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
  },
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 16,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatText: {
    fontSize: 14,
    fontWeight: '500',
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
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: -12,
    marginBottom: 16,
  },
  // Genre Grid
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  genreCard: {
    width: '30%',
    aspectRatio: 1.2,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  genreName: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Trending Songs
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  trendingRank: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
    opacity: 0.6,
  },
  trendingCover: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  trendingArtist: {
    fontSize: 13,
    opacity: 0.7,
  },
  playsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  playsCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  // Featured Playlists
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 150,
    marginRight: 16,
  },
  featuredCover: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featuredDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  // Nearby Users
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  userCard: {
    width: '46%',
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 8,
  },
  userTopArtist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topArtistText: {
    fontSize: 12,
    color: '#1DB954',
  },
});
