import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
    Modal,
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SotdSuggestionPopupProps {
    visible: boolean;
    onDismiss: () => void;
}

export default function SotdSuggestionPopup({
    visible,
    onDismiss,
}: SotdSuggestionPopupProps) {
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const handlePickSong = () => {
        onDismiss();
        router.push("/sotd");
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                {/* Blur Background */}
                <BlurView
                    intensity={5}
                    tint={isDark ? "dark" : "extraLight"}
                    style={StyleSheet.absoluteFill}
                />

                {/* Content Container - Bottom aligned */}
                <View
                    style={[
                        styles.contentContainer,
                        { paddingBottom: insets.bottom - 14 },
                    ]}
                >
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <Image
                            source={require("@/assets/images/Frame 2.svg")}
                            style={styles.icon}
                        />

                        <View style={styles.textContainer}>
                            <ThemedText type="subtitle" style={styles.title}>
                                Song of the Day
                            </ThemedText>
                            <ThemedText style={styles.description}>
                                You haven't picked your Song of the Day yet. Pick one now to share with your friends!
                            </ThemedText>
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                                onPress={onDismiss}
                            >
                                <ThemedText style={{ color: colors.text }}>Later</ThemedText>
                            </Pressable>

                            <Pressable
                                style={[styles.button, styles.confirmButton]}
                                onPress={handlePickSong}
                            >
                                <View
                                    style={[styles.buttonGradient, { backgroundColor: colors.primary }]}
                                >
                                    <ThemedText style={styles.buttonText}>Pick a Song</ThemedText>
                                </View>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    contentContainer: {
        paddingHorizontal: 20,
        justifyContent: "flex-end",
        position: "relative",
    },
    card: {
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    icon: {
        width: 96,
        height: 96,
        position: "absolute",
        top: -56,
        marginBottom: 16,
    },
    textContainer: {
        alignItems: "center",
        marginBottom: 24,
        gap: 8,
    },
    title: {
        textAlign: "center",
    },
    description: {
        textAlign: "center",
        opacity: 0.7,
        paddingHorizontal: 8,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    button: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    cancelButton: {
        borderWidth: 1,
    },
    confirmButton: {
        // shadow for button
        shadowColor: "#538ce9",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonGradient: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
});
