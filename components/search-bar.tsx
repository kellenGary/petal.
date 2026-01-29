import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, TextInput, View, ViewStyle } from "react-native";

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    containerStyle?: ViewStyle;
}

export default function SearchBar({
    value,
    onChangeText,
    placeholder = "Search...",
    containerStyle,
}: SearchBarProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    return (
        <View
            style={[
                { zIndex: 100, backgroundColor: colors.card },
                styles.container,
                containerStyle,
            ]}
        >
            <MaterialIcons
                name="search"
                size={22}
                color={colors.tabIconDefault}
            />
            <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={placeholder}
                placeholderTextColor={colors.tabIconDefault}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <Pressable onPress={() => onChangeText("")}>
                    <MaterialIcons
                        name="close"
                        size={20}
                        color={colors.tabIconDefault}
                    />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
});
