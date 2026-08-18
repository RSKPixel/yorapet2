import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { stockSummaryService } from "@/api/stockSummary";
import { StockItemActivityModal } from "@/components/reports/StockItemActivityModal";
import { colors, fonts, typography } from "@/theme";
import type { StockSummaryItem } from "@/types/stockSummary";
import { formatNumber, formatRate, formatText } from "@/utils/format";

function StockRow({
  item,
  onPress,
}: {
  item: StockSummaryItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, item.below_reorder && styles.rowReorder]}
    >
      <View style={styles.rowTop}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.stock_item}
        </Text>
        {item.below_reorder ? (
          <View style={styles.reorderBadge}>
            <Text style={styles.reorderBadgeText}>Reorder</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.groupText} numberOfLines={1}>
        {formatText(item.stock_group)}
      </Text>
      <View style={styles.metrics}>
        <Metric label="Closing" value={formatNumber(item.closing_qty)} emphasize={item.below_reorder} />
        <Metric label="Cost" value={formatRate(item.closing_rate)} />
        <Metric label="Avg sell" value={formatRate(item.avg_selling_price)} />
        <Metric label="Age" value={formatNumber(item.avg_weighted_age_days)} />
        <Metric label="Value" value={formatRate(item.closing_value)} />
      </View>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, emphasize && styles.metricValueReorder]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function StockScreen() {
  const [search, setSearch] = useState("");
  const [stockGroup, setStockGroup] = useState("");
  const [belowReorderOnly, setBelowReorderOnly] = useState(false);
  const [activityItem, setActivityItem] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["stock-summary"],
    queryFn: () => stockSummaryService.getSummary(),
  });

  const rows = summaryQuery.data?.items ?? [];

  const stockGroups = useMemo(() => {
    const unique = new Set(
      rows.map((row) => row.stock_group?.trim() ?? "").filter(Boolean),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const belowReorderCount = useMemo(
    () => rows.filter((row) => row.below_reorder).length,
    [rows],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (belowReorderOnly && !row.below_reorder) {
        return false;
      }
      if (stockGroup && (row.stock_group?.trim() ?? "") !== stockGroup) {
        return false;
      }
      if (q && !row.stock_item.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [rows, belowReorderOnly, stockGroup, search]);

  const totalClosing = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.closing_qty, 0),
    [filteredRows],
  );
  const totalClosingValue = useMemo(
    () => filteredRows.reduce((sum, row) => sum + (row.closing_value ?? 0), 0),
    [filteredRows],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search stock item"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="All groups"
            selected={stockGroup === ""}
            onPress={() => setStockGroup("")}
          />
          {stockGroups.map((group) => (
            <Chip
              key={group}
              label={group}
              selected={stockGroup === group}
              onPress={() => setStockGroup(group)}
            />
          ))}
        </ScrollView>

        {belowReorderCount > 0 ? (
          <Pressable
            onPress={() => setBelowReorderOnly((current) => !current)}
            style={[
              styles.reorderFilter,
              belowReorderOnly
                ? styles.reorderFilterFilled
                : styles.reorderFilterOutline,
            ]}
          >
            <Text
              style={[
                styles.reorderFilterText,
                belowReorderOnly && styles.reorderFilterTextFilled,
              ]}
            >
              Reorder
            </Text>
            <View
              style={[
                styles.reorderCount,
                belowReorderOnly && styles.reorderCountFilled,
              ]}
            >
              <Text
                style={[
                  styles.reorderCountText,
                  belowReorderOnly && styles.reorderCountTextFilled,
                ]}
              >
                {belowReorderCount}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      {summaryQuery.isLoading && rows.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.empty}>Loading stock summary…</Text>
        </View>
      ) : summaryQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.error}>
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : "Failed to load stock summary"}
          </Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              void summaryQuery.refetch();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.listFlex}
          data={filteredRows}
          keyExtractor={(item) => item.stock_item}
          renderItem={({ item }) => (
            <StockRow
              item={item}
              onPress={() => setActivityItem(item.stock_item)}
            />
          )}
          contentContainerStyle={
            filteredRows.length === 0 ? styles.listEmpty : styles.list
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {belowReorderOnly
                ? "No reorder items match the selected filters."
                : "No stock position data found."}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={summaryQuery.isFetching && !summaryQuery.isLoading}
              onRefresh={() => {
                void summaryQuery.refetch();
              }}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          {summaryQuery.isLoading
            ? "Loading…"
            : summaryQuery.isError
              ? "—"
              : `${filteredRows.length} item${filteredRows.length === 1 ? "" : "s"}${
                  belowReorderOnly && rows.length > 0
                    ? ` / ${rows.length}`
                    : ""
                }`}
        </Text>
        <View style={styles.footerTotals}>
          <Text style={styles.footerMetric}>
            Qty {summaryQuery.isLoading || summaryQuery.isError ? "—" : formatNumber(totalClosing)}
          </Text>
          <Text style={styles.footerMetric}>
            Value{" "}
            {summaryQuery.isLoading || summaryQuery.isError
              ? "—"
              : formatRate(totalClosingValue)}
          </Text>
        </View>
      </View>

      {activityItem ? (
        <StockItemActivityModal
          stockItem={activityItem}
          onClose={() => setActivityItem(null)}
        />
      ) : null}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text
        style={[styles.chipText, selected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  toolbar: {
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    flexGrow: 0,
    flexShrink: 0,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: fonts.sans,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 40,
  },
  chips: {
    gap: 8,
    alignItems: "center",
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    maxWidth: 200,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    ...typography.muted,
    color: colors.muted,
  },
  chipTextSelected: {
    color: colors.accent,
    fontFamily: fonts.sansMedium,
  },
  reorderFilter: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  reorderFilterOutline: {
    borderColor: "#d97706",
    backgroundColor: "transparent",
  },
  reorderFilterFilled: {
    borderColor: "#d97706",
    backgroundColor: "rgba(217, 119, 6, 0.16)",
  },
  reorderFilterText: {
    ...typography.muted,
    color: "#b45309",
    fontFamily: fonts.sansMedium,
  },
  reorderFilterTextFilled: {
    color: "#92400e",
  },
  reorderCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: "rgba(217, 119, 6, 0.18)",
    alignItems: "center",
  },
  reorderCountFilled: {
    backgroundColor: "#d97706",
  },
  reorderCountText: {
    ...typography.muted,
    fontSize: 11,
    color: "#92400e",
    fontFamily: fonts.sansSemiBold,
  },
  reorderCountTextFilled: {
    color: "#fff7ed",
  },
  list: {
    padding: 12,
    paddingBottom: 8,
    gap: 8,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  listFlex: {
    flex: 1,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
  retryText: {
    ...typography.button,
    color: colors.accentContrast,
  },
  empty: {
    ...typography.muted,
    color: colors.muted,
    textAlign: "center",
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: "center",
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
    gap: 6,
    marginBottom: 8,
  },
  rowReorder: {
    borderColor: "rgba(217, 119, 6, 0.45)",
    backgroundColor: "rgba(217, 119, 6, 0.08)",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  itemName: {
    flex: 1,
    ...typography.title,
    fontSize: 15,
    color: colors.accent,
  },
  reorderBadge: {
    borderRadius: 999,
    backgroundColor: "#d97706",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reorderBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: "#fff7ed",
  },
  groupText: {
    ...typography.muted,
    color: colors.muted,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  metric: {
    width: "30%",
    flexGrow: 1,
  },
  metricLabel: {
    ...typography.muted,
    fontSize: 11,
    color: colors.muted,
  },
  metricValue: {
    ...typography.label,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  metricValueReorder: {
    color: "#b45309",
    fontFamily: fonts.sansSemiBold,
  },
  footer: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  footerLabel: {
    ...typography.muted,
    color: colors.muted,
    flexShrink: 1,
  },
  footerTotals: {
    flexDirection: "row",
    gap: 12,
  },
  footerMetric: {
    ...typography.label,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
});
