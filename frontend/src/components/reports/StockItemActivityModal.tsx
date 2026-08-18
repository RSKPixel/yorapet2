import { useQuery } from "@tanstack/react-query";

import { Modal } from "@/components/ui/Modal";
import { stockSummaryService } from "@/services/stockSummaryService";
import type { StockSummaryActivityLine } from "@/types/stockSummary";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const rateFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type StockItemActivityModalProps = {
  stockItem: string;
  onClose: () => void;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateFormatter.format(date);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return rateFormatter.format(value);
}

function formatText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function ActivityTable({
  title,
  partyLabel,
  rows,
  emptyMessage,
  showDiscountedRate = false,
  showPurchasedQty = false,
}: {
  title: string;
  partyLabel: string;
  rows: StockSummaryActivityLine[];
  emptyMessage: string;
  showDiscountedRate?: boolean;
  showPurchasedQty?: boolean;
}) {
  const colCount = 5 + (showPurchasedQty ? 1 : 0) + (showDiscountedRate ? 1 : 0);

  return (
    <section className="stock-activity-section">
      <h2 className="stock-activity-section__title">{title}</h2>
      <div className="app-table-wrap stock-activity-table-wrap">
        <div className="app-table-shell">
          <div className="app-table-scroll stock-activity-table-scroll">
            <table className="app-table app-table--sales-report">
              <colgroup>
                <col style={{ width: "18%" }} />
                <col />
                {showPurchasedQty ? <col className="sales-report-col-qty" /> : null}
                <col className="sales-report-col-qty" />
                <col className="sales-report-col-rate" />
                {showDiscountedRate ? <col className="sales-report-col-rate" /> : null}
                <col className="sales-report-col-rate" />
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{partyLabel}</th>
                  {showPurchasedQty ? (
                    <th className="app-table-num" title="Original purchased qty">
                      Purchased
                    </th>
                  ) : null}
                  <th
                    className="app-table-num"
                    title={
                      showPurchasedQty
                        ? "Qty still in closing stock from this purchase"
                        : undefined
                    }
                  >
                    {showPurchasedQty ? "In stock" : "Qty"}
                  </th>
                  <th className="app-table-num">Rate</th>
                  {showDiscountedRate ? (
                    <th className="app-table-num" title="Value ÷ qty">
                      Disc. rate
                    </th>
                  ) : null}
                  <th className="app-table-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="app-table-empty">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={`${row.voucher_no ?? "row"}-${row.voucher_date ?? index}-${index}`}
                    >
                      <td>{formatDate(row.voucher_date)}</td>
                      <td title={row.party ?? undefined}>{formatText(row.party)}</td>
                      {showPurchasedQty ? (
                        <td className="app-table-num">
                          {formatNumber(row.purchased_qty)}
                        </td>
                      ) : null}
                      <td className="app-table-num">{formatNumber(row.qty)}</td>
                      <td className="app-table-num">{formatRate(row.rate)}</td>
                      {showDiscountedRate ? (
                        <td className="app-table-num">
                          {formatRate(row.discounted_rate)}
                        </td>
                      ) : null}
                      <td className="app-table-num">{formatRate(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
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
      title={stockItem}
      onClose={onClose}
      className="app-modal--stock-activity"
      ariaLabelledBy="stock-activity-modal-title"
    >
      <div className="stock-activity-body">
        {activityQuery.isLoading ? (
          <p className="app-table-empty">Loading recent activity…</p>
        ) : activityQuery.isError ? (
          <p className="app-table-empty text-[var(--color-danger)]" role="alert">
            {(activityQuery.error as Error).message}
          </p>
        ) : (
          <>
            <ActivityTable
              title={
                activityQuery.data?.closing_qty != null
                  ? `Purchases in closing stock (${formatNumber(activityQuery.data.closing_qty)})`
                  : "Purchases in closing stock"
              }
              partyLabel="Supplier"
              rows={activityQuery.data?.purchases ?? []}
              emptyMessage="No purchase lots found for closing stock."
              showDiscountedRate
              showPurchasedQty
            />
            <ActivityTable
              title="Recent sales"
              partyLabel="Buyer"
              rows={activityQuery.data?.sales ?? []}
              emptyMessage="No sales found for this item."
            />
          </>
        )}
      </div>
    </Modal>
  );
}
