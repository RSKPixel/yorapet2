import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/theme";

type PlaceholderProps = {
  title: string;
  body: string;
};

export function ReportPlaceholder({ title, body }: PlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    ...typography.pageTitle,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    ...typography.body,
    color: colors.muted,
  },
});
