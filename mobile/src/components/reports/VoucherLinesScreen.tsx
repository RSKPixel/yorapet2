import { useMemo, useState, type ReactNode } from "react";
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

import { colors, fonts, typography } from "@/theme";
import {
  REPORT_PERIOD_OPTIONS,
  isDateInRange,
  resolveReportPeriodRange,
  type ReportPeriodKey,
} from "@/utils/datePeriods";
import { formatDate, formatNumber, formatRate, formatText } from "@/utils/format";

export type VoucherLine = {
  id: number;
  voucher_no: string | null;
  voucher_date: string | null;
  ledger_name: string | null;
  stock_item: string | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
};

type VoucherGroup = {
  key: string;
  voucher_no: string | null;
  voucher_date: string | null;
  ledger_name: string | null;
  lines: VoucherLine[];
  qty: number;
  amount: number;
};

type VoucherLinesScreenProps = {
  emptyMessage: string;
  lines: VoucherLine[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  errorMessage?: string;
  onRefresh: () => void;
  /** Group lines by voucher no + date; list stock items under each voucher. */
  groupByVoucher?: boolean;
};

function voucherKey(row: VoucherLine) {
  return `${row.voucher_date ?? ""}\0${row.voucher_no ?? ""}`;
}

function groupLinesByVoucher(rows: VoucherLine[]): VoucherGroup[] {
  const groups = new Map<string, VoucherGroup>();

  for (const row of rows) {
    const key = voucherKey(row);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        voucher_no: row.voucher_no,
        voucher_date: row.voucher_date,
        ledger_name: row.ledger_name,
        lines: [row],
        qty: row.qty ?? 0,
        amount: row.amount ?? 0,
      });
      continue;
    }
    existing.lines.push(row);
    existing.qty += row.qty ?? 0;
    existing.amount += row.amount ?? 0;
  }

  return Array.from(groups.values());
}

function LineCard({ item }: { item: VoucherLine }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.voucher} numberOfLines={1}>
          {formatText(item.voucher_no)}
        </Text>
        <Text style={styles.date}>{formatDate(item.voucher_date)}</Text>
      </View>
      <Text style={styles.party} numberOfLines={1}>
        {formatText(item.ledger_name)}
      </Text>
      <Text style={styles.item} numberOfLines={2}>
        {formatText(item.stock_item)}
      </Text>
      <View style={styles.metrics}>
        <Metric label="Qty" value={formatNumber(item.qty)} />
        <Metric label="Rate" value={formatRate(item.rate)} />
        <Metric label="Amount" value={formatRate(item.amount)} />
      </View>
    </View>
  );
}

function VoucherGroupCard({ group }: { group: VoucherGroup }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.voucher} numberOfLines={1}>
          {formatText(group.voucher_no)}
        </Text>
        <Text style={styles.date}>{formatDate(group.voucher_date)}</Text>
      </View>
      <Text style={styles.party} numberOfLines={1}>
        {formatText(group.ledger_name)}
      </Text>
      <View style={styles.voucherTotals}>
        <Text style={styles.voucherTotalsText}>
          {group.lines.length} item{group.lines.length === 1 ? "" : "s"}
        </Text>
        <Text style={styles.voucherTotalsText}>
          Qty {formatNumber(group.qty)} · Amt {formatRate(group.amount)}
        </Text>
      </View>

      <View style={styles.itemList}>
        {group.lines.map((line) => (
          <View key={line.id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {formatText(line.stock_item)}
            </Text>
            <View style={styles.itemMeta}>
              <Text style={styles.itemMetaText}>
                {formatNumber(line.qty)} × {formatRate(line.rate)}
              </Text>
              <Text style={styles.itemAmount}>{formatRate(line.amount)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
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

export function VoucherLinesScreen({
  emptyMessage,
  lines,
  isLoading,
  isError,
  isFetching,
  errorMessage,
  onRefresh,
  groupByVoucher = false,
}: VoucherLinesScreenProps) {
  const [period, setPeriod] = useState<ReportPeriodKey>("this_month");
  const [search, setSearch] = useState("");

  const range = useMemo(() => resolveReportPeriodRange(period), [period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((row) => {
      if (!isDateInRange(row.voucher_date, range)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [row.voucher_no, row.ledger_name, row.stock_item]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [lines, range, search]);

  const voucherGroups = useMemo(
    () => (groupByVoucher ? groupLinesByVoucher(filtered) : []),
    [filtered, groupByVoucher],
  );

  const totals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    for (const row of filtered) {
      qty += row.qty ?? 0;
      amount += row.amount ?? 0;
    }
    return {
      qty,
      amount,
      count: groupByVoucher ? voucherGroups.length : filtered.length,
      unit: groupByVoucher ? "voucher" : "line",
    };
  }, [filtered, groupByVoucher, voucherGroups.length]);

  let body: ReactNode;
  if (isLoading && lines.length === 0) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.empty}>Loading…</Text>
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.centered}>
        <Text style={styles.error}>{errorMessage ?? "Failed to load"}</Text>
        <Pressable style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (groupByVoucher) {
    body = (
      <FlatList
        style={styles.listFlex}
        data={voucherGroups}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <VoucherGroupCard group={item} />}
        contentContainerStyle={
          voucherGroups.length === 0 ? styles.listEmpty : styles.list
        }
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />
    );
  } else {
    body = (
      <FlatList
        style={styles.listFlex}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <LineCard item={item} />}
        contentContainerStyle={
          filtered.length === 0 ? styles.listEmpty : styles.list
        }
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search voucher, party, item"
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
          {REPORT_PERIOD_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={period === option.value}
              onPress={() => setPeriod(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      {body}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          {isLoading
            ? "Loading…"
            : isError
              ? "—"
              : `${totals.count} ${totals.unit}${totals.count === 1 ? "" : "s"}`}
        </Text>
        <View style={styles.footerTotals}>
          <Text style={styles.footerMetric}>
            Qty {isLoading || isError ? "—" : formatNumber(totals.qty)}
          </Text>
          <Text style={styles.footerMetric}>
            Amt {isLoading || isError ? "—" : formatRate(totals.amount)}
          </Text>
        </View>
      </View>
    </View>
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
  listFlex: {
    flex: 1,
  },
  list: {
    padding: 12,
    paddingBottom: 8,
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
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  voucher: {
    flex: 1,
    ...typography.title,
    fontSize: 15,
    color: colors.accent,
  },
  date: {
    ...typography.muted,
    color: colors.muted,
  },
  party: {
    ...typography.body,
    color: colors.ink,
  },
  item: {
    ...typography.muted,
    color: colors.muted,
  },
  voucherTotals: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  voucherTotalsText: {
    ...typography.muted,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  itemList: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 8,
  },
  itemRow: {
    gap: 2,
  },
  itemName: {
    ...typography.body,
    color: colors.ink,
  },
  itemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  itemMetaText: {
    ...typography.muted,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  itemAmount: {
    ...typography.label,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  metric: {
    flex: 1,
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
