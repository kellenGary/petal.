import { Dispatch, SetStateAction, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type TabType = string;

export default function TabNavigation({
  tabs,
  activeTab,
  setActiveTab,
}: {
  tabs: string[];
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <>
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab, { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[styles.tabText, activeTab === tab && styles.activeTabText, { color: activeTab === tab ? colors.primary : colors.text }]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#538ce9ff",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#538ce9ff",
    fontWeight: "600",
  },
});
