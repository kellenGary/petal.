import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ProfileData } from "@/services/profileApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import FollowButton from "./follow-button";
import SOTDProfile from "./sotd-profile";

interface ProfileHeaderProps {
    profileData: ProfileData | null;
    isOwnProfile: boolean;
    sotd: any;
    userId?: number;
    onFollowChange: (isFollowing: boolean) => void;
}

export default function ProfileHeader({
    profileData,
    isOwnProfile,
    sotd,
    userId,
    onFollowChange,
}: ProfileHeaderProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    return (
        <>
            {/* Header Actions */}
            <View style={styles.headerActions}>
                {/* Back button for other users' profiles */}
                {!isOwnProfile && (
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
                    </Pressable>
                )}
                {/* Settings button only for own profile */}
                {isOwnProfile ? (
                    <>
                        <Pressable
                            style={[styles.mapButton, { backgroundColor: colors.card }]}
                            onPress={() => router.push("/listening-map")}
                        >
                            <MaterialIcons name="map" size={24} color={colors.icon} />
                        </Pressable>
                        <Pressable
                            style={[styles.settingsButton, { backgroundColor: colors.card }]}
                            onPress={() => router.push("/(settings)")}
                        >
                            <MaterialIcons name="settings" size={24} color={colors.icon} />
                        </Pressable>
                    </>
                ) : (
                    <View style={styles.spacer} />
                )}
            </View>

            {/* Profile Picture */}
            <View style={styles.profileCenter}>
                <SOTDProfile track={sotd || null} isOwnProfile={isOwnProfile} />
                <View style={styles.profileImageContainer}>
                    <Image
                        source={{ uri: profileData ? profileData.profileImageUrl : "" }}
                        style={styles.profileImage}
                    />
                </View>

                {/* Name & Username */}
                <ThemedText type="subtitle" style={styles.profileName}>
                    {profileData ? profileData.displayName : "Unknown"}
                </ThemedText>
                <ThemedText>
                    {profileData ? "@" + profileData.handle : "unknown"}
                </ThemedText>

                {/* Follow Button for other users' profiles */}
                {!isOwnProfile && (
                    <FollowButton userId={userId} onFollowChange={onFollowChange} />
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    headerActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 16,
    },
    spacer: {
        width: 40,
    },
    mapButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    profileCenter: {
        alignItems: "center",
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
        borderColor: "#fff",
    },
    profileName: {
        marginBottom: 4,
    },
});
