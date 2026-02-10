import React, { createContext, useCallback, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

interface ScrollContextType {
    isCollapsed: SharedValue<number>; // 1 = collapsed/folded, 0 = expanded
    collapse: () => void;
    expand: () => void;
}

const ScrollContext = createContext<ScrollContextType | null>(null);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
    // Shared value: 1 when collapsed, 0 when expanded
    const isCollapsed = useSharedValue(0);

    const collapse = useCallback(() => {
        // Animate to collapsed state
        isCollapsed.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    }, [isCollapsed]);

    const expand = useCallback(() => {
        // Animate to expanded state
        isCollapsed.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, [isCollapsed]);

    return (
        <ScrollContext.Provider value={{ isCollapsed, collapse, expand }}>
            {children}
        </ScrollContext.Provider>
    );
}

export function useScrollContext() {
    const context = useContext(ScrollContext);
    if (!context) {
        throw new Error('useScrollContext must be used within a ScrollProvider');
    }
    return context;
}
