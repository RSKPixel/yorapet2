import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, typography } from "@/theme";

type FormPanelProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  footerMessage?: string | null;
};

/** Mobile counterpart of frontend FormPanel / default-win-form. */
export function FormPanel({
  title,
  children,
  footer,
  footerMessage,
}: FormPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
      <View style={styles.footer}>
        {footerMessage ? (
          <Text style={styles.footerMessage} numberOfLines={2}>
            {footerMessage}
          </Text>
        ) : (
          <View style={styles.footerSpacer} />
        )}
        {footer}
      </View>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  children: ReactNode;
};

export function FormField({ label, children }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13.6,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  header: {
    minHeight: 44,
    paddingVertical: 7,
    paddingHorizontal: 13.6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  body: {
    padding: 13.6,
    backgroundColor: colors.surfaceRaised,
    gap: 0,
  },
  footer: {
    minHeight: 44,
    paddingVertical: 7,
    paddingHorizontal: 13.6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  footerMessage: {
    flex: 1,
    ...typography.muted,
    color: colors.danger,
  },
  footerSpacer: {
    flex: 1,
  },
  field: {
    marginBottom: 10.4,
    gap: 4.5,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
});

export const formControlStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 7.2,
  backgroundColor: colors.surface,
  color: colors.ink,
  paddingVertical: 7.2,
  paddingHorizontal: 12,
  fontSize: 15,
  lineHeight: 20,
  fontFamily: fonts.sans,
  minHeight: 40,
} as const;

export const primaryButtonStyle = {
  borderRadius: 7.2,
  backgroundColor: colors.accent,
  paddingVertical: 5.6,
  paddingHorizontal: 12,
  minHeight: 36,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

export const primaryButtonTextStyle = {
  ...typography.button,
  color: colors.accentContrast,
};
