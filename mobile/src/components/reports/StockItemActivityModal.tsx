import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { stockSummaryService } from "@/api/stockSummary";
import { colors, typography } from "@/theme";
import type { StockSummaryActivityLine } from "@/types/stockSummary";
import { formatDate, formatNumber, formatRate, formatText } from "@/utils/format";

type StockItemActivityModalProps = {
  stockItem: string;
  onClose: () => void;
};

function ActivitySection({
  title,
  partyLabel,
  rows,
  emptyMessage,
  showPurchasedQty = false,
  showDiscountedRate = false,
}: {
  title: string;
  partyLabel: string;
  rows: StockSummaryActivityLine[];
  emptyMessage: string;
  showPurchasedQty?: boolean;
  showDiscountedRate?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        rows.map((row, index) => (
          <View
            key={`${row.voucher_no ?? "row"}-${row.voucher_date ?? index}-${index}`}
            style={styles.lineCard}
          >
            <View style={styles.lineHeader}>
              <Text style={styles.lineDate}>{formatDate(row.voucher_date)}</Text>
              <Text style={styles.lineAmount}>{formatRate(row.amount)}</Text>
            </View>
            <Text style={styles.lineParty} numberOfLines={2}>
              {partyLabel}: {formatText(row.party)}
            </Text>
            <View style={styles.lineMeta}>
              {showPurchasedQty ? (
                <Text style={styles.metaText}>
                  Purchased {formatNumber(row.purchased_qty)}
                </Text>
              ) : null}
              <Text style={styles.metaText}>
                {showPurchasedQty ? "In stock" : "Qty"} {formatNumber(row.qty)}
              </Text>
              <Text style={styles.metaText}>Rate {formatRate(row.rate)}</Text>
              {showDiscountedRate ? (
                <Text style={styles.metaText}>
                  Disc. {formatRate(row.discounted_rate)}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export function StockItemActivityModal({
  stockItem,
  onClose,
}: StockItemActivityModalProps) {
  const activityQuery = useQuery({
    queryKey: ["stock-summary-activity", stockItem],
    queryFn: () => stockSummaryService.getActivity(stockItem),
  });

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>
              {stockItem}
            </Text>
            <Text style={styles.subtitle}>Recent activity</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {activityQuery.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.empty}>Loading recent activity…</Text>
            </View>
          ) : activityQuery.isError ? (
            <Text style={styles.error} accessibilityRole="alert">
              {(activityQuery.error as Error).message}
            </Text>
          ) : (
            <>
              <ActivitySection
                title={
                  activityQuery.data?.closing_qty != null
                    ? `Purchases in closing stock (${formatNumber(activityQuery.data.closing_qty)})`
                    : "Purchases in closing stock"
                }
                partyLabel="Supplier"
                rows={activityQuery.data?.purchases ?? []}
                emptyMessage="No purchase lots found for closing stock."
                showPurchasedQty
                showDiscountedRate
              />
              <ActivitySection
                title="Recent sales"
                partyLabel="Buyer"
                rows={activityQuery.data?.sales ?? []}
                emptyMessage="No sales found for this item."
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.title,
    fontSize: 16,
    color: colors.ink,
  },
  subtitle: {
    ...typography.muted,
    marginTop: 2,
    color: colors.muted,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  closeText: {
    ...typography.button,
    color: colors.accent,
  },
  body: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  centered: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.ink,
    marginBottom: 4,
  },
  lineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
    gap: 6,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  lineDate: {
    ...typography.label,
    color: colors.ink,
  },
  lineAmount: {
    ...typography.label,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  lineParty: {
    ...typography.body,
    color: colors.muted,
  },
  lineMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaText: {
    ...typography.muted,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    ...typography.muted,
    color: colors.muted,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
});
