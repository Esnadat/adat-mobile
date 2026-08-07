import React from "react";
import { ScrollView, ScrollViewProps, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { floatingTabBarBottomInset } from "../../theme/shadows";

type Props = ScrollViewProps & {
  children: React.ReactNode;
};

/** Scrollable screen with tab bar inset and standard background */
export function AppScreen({ children, contentContainerStyle, ...rest }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 20,
    paddingBottom: floatingTabBarBottomInset + 12,
    flexGrow: 1,
  },
});
