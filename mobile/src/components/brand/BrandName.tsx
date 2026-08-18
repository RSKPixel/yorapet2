import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, typography } from "@/theme";

type BrandNameProps = {
  hero?: boolean;
};

/** All-caps split wordmark: YORA (accent) + PET (ink), matching frontend. */
export function BrandName({ hero = false }: BrandNameProps) {
  return (
    <View
      style={[styles.row, hero && styles.rowHero]}
      accessibilityRole="header"
      accessibilityLabel="YORA PET"
    >
      <Text style={hero ? styles.heroPrimary : styles.primary}>YORA</Text>
      <Text style={hero ? styles.heroSecondary : styles.secondary}>PET</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowHero: {
    gap: 7,
  },
  primary: {
    ...typography.brand,
    color: colors.accent,
  },
  secondary: {
    ...typography.brand,
    color: colors.ink,
  },
  heroPrimary: {
    ...typography.brandHero,
    fontFamily: fonts.sansSemiBold,
    color: colors.accent,
  },
  heroSecondary: {
    ...typography.brandHero,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
});
