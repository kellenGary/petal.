import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TabConfig {
    name: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    iconFilled: keyof typeof MaterialIcons.glyphMap;
}

const TAB_CONFIG: TabConfig[] = [
    { name: "index", icon: "home", iconFilled: "home" },
    { name: "map", icon: "map", iconFilled: "map" },
    { name: "post", icon: "add-circle-outline", iconFilled: "add-circle" },
    { name: "explore", icon: "search", iconFilled: "search" },
    { name: "profile", icon: "person-outline", iconFilled: "person" },
];

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                    paddingBottom: insets.bottom || 8,
                    borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                },
            ]}
        >
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const tabConfig = TAB_CONFIG.find((t) => t.name === route.name);

                if (!tabConfig) return null;

                const onPress = () => {
                    const event = navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: "tabLongPress",
                        target: route.key,
                    });
                };

                return (
                    <TabButton
                        key={route.key}
                        icon={isFocused ? tabConfig.iconFilled : tabConfig.icon}
                        isFocused={isFocused}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        colors={colors}
                    />
                );
            })}
        </View>
    );
}

interface TabButtonProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
    colors: typeof Colors.light;
}

function TabButton({ icon, isFocused, onPress, onLongPress, colors }: TabButtonProps) {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: withSpring(isFocused ? 1.1 : 1, {
                        damping: 15,
                        stiffness: 200,
                    }),
                },
            ],
        };
    });

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
        >
            <Animated.View style={animatedStyle}>
                <MaterialIcons
                    name={icon}
                    size={26}
                    color={isFocused ? Colors.primary : colors.icon}
                />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingTop: 10,
        borderTopWidth: 0.5,
    },
    tabButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
    },
});
