import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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

import { stockPnlService } from "@/api/stockPnl";
import { colors, fonts, typography } from "@/theme";
import type { StockPnlItem } from "@/types/stockPnl";
import {
  PNL_RESULT_FILTER_OPTIONS,
  STOCK_PNL_PERIOD_OPTIONS,
  resolveStockPnlPeriodRange,
  type PnlResultFilterKey,
  type StockPnlPeriodKey,
} from "@/utils/datePeriods";
import { formatNumber, formatRate, formatText } from "@/utils/format";

function pnlColor(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) {
    return colors.ink;
  }
  return value < 0 ? colors.danger : "#15803d";
}

function matchesPnlResultFilter(row: StockPnlItem, filter: PnlResultFilterKey) {
  switch (filter) {
    case "profits":
      return row.pnl_amount !== null && row.pnl_amount > 0;
    case "losses":
      return row.pnl_amount !== null && row.pnl_amount < 0;
    default:
      return true;
  }
}

function countPnlResultFilter(rows: StockPnlItem[], filter: PnlResultFilterKey) {
  return rows.filter((row) => matchesPnlResultFilter(row, filter)).length;
}

function PnlRow({ item }: { item: StockPnlItem }) {
  return (
    <View style={styles.row}>
      <Text style={styles.itemName} numberOfLines={2}>
        {item.stock_item}
      </Text>
      <Text style={styles.groupText} numberOfLines={1}>
        {formatText(item.stock_group)}
      </Text>
      <View style={styles.metrics}>
        <Metric label="Cost" value={formatRate(item.cost_price)} />
        <Metric label="Avg sell" value={formatRate(item.avg_sell_price)} />
        <Metric label="Sell qty" value={formatNumber(item.sell_qty)} />
        <Metric
          label="Profit/unit"
          value={formatRate(item.profit_per_unit)}
          valueColor={pnlColor(item.profit_per_unit)}
        />
        <Metric
          label="P&L"
          value={formatRate(item.pnl_amount)}
          valueColor={pnlColor(item.pnl_amount)}
          emphasize
        />
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  valueColor = colors.ink,
  emphasize = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          emphasize && styles.metricValueEmphasize,
          { color: valueColor },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function PnlScreen() {
  const [period, setPeriod] = useState<StockPnlPeriodKey>("all");
  const [resultFilter, setResultFilter] = useState<PnlResultFilterKey>("all");
  const [search, setSearch] = useState("");
  const [stockGroup, setStockGroup] = useState("");

  const periodRange = useMemo(() => resolveStockPnlPeriodRange(period), [period]);

  const pnlQuery = useQuery({
    queryKey: [
      "stock-pnl",
      periodRange?.dateFrom ?? "all",
      periodRange?.dateTo ?? "all",
    ],
    queryFn: () =>
      stockPnlService.getPnl(
        periodRange
          ? { dateFrom: periodRange.dateFrom, dateTo: periodRange.dateTo }
          : {},
      ),
  });

  const rows = pnlQuery.data?.items ?? [];

  const stockGroups = useMemo(() => {
    const unique = new Set(
      rows.map((row) => row.stock_group?.trim() ?? "").filter(Boolean),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const scopedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.sell_qty <= 0) {
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
  }, [rows, stockGroup, search]);

  const resultFilterCounts = useMemo(
    () => ({
      profits: countPnlResultFilter(scopedRows, "profits"),
      losses: countPnlResultFilter(scopedRows, "losses"),
    }),
    [scopedRows],
  );

  useEffect(() => {
    if (resultFilter === "all") {
      return;
    }
    if (resultFilterCounts[resultFilter] === 0) {
      setResultFilter("all");
    }
  }, [resultFilter, resultFilterCounts]);

  const filteredRows = useMemo(
    () => scopedRows.filter((row) => matchesPnlResultFilter(row, resultFilter)),
    [scopedRows, resultFilter],
  );

  const totalSellQty = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.sell_qty, 0),
    [filteredRows],
  );
  const totalPnl = useMemo(
    () =>
      filteredRows.reduce((sum, row) => {
        if (row.pnl_amount === null || row.pnl_amount === undefined) {
          return sum;
        }
        return sum + row.pnl_amount;
      }, 0),
    [filteredRows],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {STOCK_PNL_PERIOD_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={period === option.value}
              onPress={() => setPeriod(option.value)}
            />
          ))}
        </ScrollView>

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {PNL_RESULT_FILTER_OPTIONS.map((option) => {
            const count = resultFilterCounts[option.value];
            if (count <= 0) {
              return null;
            }
            const tone = option.value === "profits" ? "profit" : "loss";
            return (
              <FilterChip
                key={option.value}
                label={option.label}
                count={count}
                selected={resultFilter === option.value}
                tone={tone}
                onPress={() =>
                  setResultFilter((current) =>
                    current === option.value ? "all" : option.value,
                  )
                }
              />
            );
          })}
        </ScrollView>
      </View>

      {pnlQuery.isLoading && rows.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.empty}>Loading stock P&L…</Text>
        </View>
      ) : pnlQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.error}>
            {pnlQuery.error instanceof Error
              ? pnlQuery.error.message
              : "Failed to load stock P&L"}
          </Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              void pnlQuery.refetch();
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
          renderItem={({ item }) => <PnlRow item={item} />}
          contentContainerStyle={
            filteredRows.length === 0 ? styles.listEmpty : styles.list
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {resultFilter !== "all"
                ? "No items match the selected filters."
                : "No stock items with sales in this period."}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={pnlQuery.isFetching && !pnlQuery.isLoading}
              onRefresh={() => {
                void pnlQuery.refetch();
              }}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          {pnlQuery.isLoading
            ? "Loading…"
            : pnlQuery.isError
              ? "—"
              : `${filteredRows.length} item${filteredRows.length === 1 ? "" : "s"}${
                  (resultFilter !== "all" || stockGroup || search.trim()) &&
                  scopedRows.length > 0
                    ? ` / ${scopedRows.length}`
                    : ""
                }`}
        </Text>
        <View style={styles.footerTotals}>
          <Text style={styles.footerMetric}>
            Qty{" "}
            {pnlQuery.isLoading || pnlQuery.isError
              ? "—"
              : formatNumber(totalSellQty)}
          </Text>
          <Text style={[styles.footerMetric, { color: pnlColor(totalPnl) }]}>
            P&L{" "}
            {pnlQuery.isLoading || pnlQuery.isError
              ? "—"
              : formatRate(totalPnl)}
          </Text>
        </View>
      </View>
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

function FilterChip({
  label,
  count,
  selected,
  tone,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  tone: "sales" | "profit" | "loss";
  onPress: () => void;
}) {
  const toneStyles =
    tone === "profit"
      ? {
          outline: styles.filterProfitOutline,
          filled: styles.filterProfitFilled,
          text: styles.filterProfitText,
          textFilled: styles.filterProfitTextFilled,
          count: styles.filterProfitCount,
          countFilled: styles.filterProfitCountFilled,
          countText: styles.filterProfitCountText,
          countTextFilled: styles.filterProfitCountTextFilled,
        }
      : tone === "loss"
        ? {
            outline: styles.filterLossOutline,
            filled: styles.filterLossFilled,
            text: styles.filterLossText,
            textFilled: styles.filterLossTextFilled,
            count: styles.filterLossCount,
            countFilled: styles.filterLossCountFilled,
            countText: styles.filterLossCountText,
            countTextFilled: styles.filterLossCountTextFilled,
          }
        : {
            outline: styles.filterSalesOutline,
            filled: styles.filterSalesFilled,
            text: styles.filterSalesText,
            textFilled: styles.filterSalesTextFilled,
            count: styles.filterSalesCount,
            countFilled: styles.filterSalesCountFilled,
            countText: styles.filterSalesCountText,
            countTextFilled: styles.filterSalesCountTextFilled,
          };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        selected ? toneStyles.filled : toneStyles.outline,
        selected && styles.filterChipSelected,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          selected ? styles.filterChipTextSelected : toneStyles.text,
        ]}
      >
        {label}
      </Text>
      <View style={[styles.filterCount, selected ? toneStyles.countFilled : toneStyles.count]}>
        <Text
          style={[
            styles.filterCountText,
            selected ? toneStyles.countTextFilled : toneStyles.countText,
          ]}
        >
          {count}
        </Text>
      </View>
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
    paddingTop: 8,
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
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterChipSelected: {
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipText: {
    ...typography.muted,
    fontFamily: fonts.sansMedium,
  },
  filterChipTextSelected: {
    fontFamily: fonts.sansSemiBold,
    color: "#fff",
  },
  filterCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: 999,
    alignItems: "center",
  },
  filterCountText: {
    ...typography.muted,
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
  },
  filterSalesOutline: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterSalesFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  filterSalesText: {
    color: colors.accent,
  },
  filterSalesTextFilled: {
    color: colors.accentContrast,
  },
  filterSalesCount: {
    backgroundColor: colors.accentSoft,
  },
  filterSalesCountFilled: {
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  filterSalesCountText: {
    color: colors.accent,
  },
  filterSalesCountTextFilled: {
    color: colors.accentContrast,
  },
  filterProfitOutline: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterProfitFilled: {
    borderColor: "#15803d",
    backgroundColor: "#15803d",
  },
  filterProfitText: {
    color: "#15803d",
  },
  filterProfitTextFilled: {
    color: "#fff",
  },
  filterProfitCount: {
    backgroundColor: "rgba(21, 128, 61, 0.12)",
  },
  filterProfitCountFilled: {
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  filterProfitCountText: {
    color: "#15803d",
  },
  filterProfitCountTextFilled: {
    color: "#fff",
  },
  filterLossOutline: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterLossFilled: {
    borderColor: colors.danger,
    backgroundColor: colors.danger,
  },
  filterLossText: {
    color: colors.danger,
  },
  filterLossTextFilled: {
    color: "#fff",
  },
  filterLossCount: {
    backgroundColor: "rgba(220, 38, 38, 0.12)",
  },
  filterLossCountFilled: {
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  filterLossCountText: {
    color: colors.danger,
  },
  filterLossCountTextFilled: {
    color: "#fff",
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
  itemName: {
    ...typography.title,
    fontSize: 15,
    color: colors.ink,
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
    fontVariant: ["tabular-nums"],
  },
  metricValueEmphasize: {
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
