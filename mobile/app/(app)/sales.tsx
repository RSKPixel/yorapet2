import { useQuery } from "@tanstack/react-query";

import { salesService } from "@/api/sales";
import { VoucherLinesScreen } from "@/components/reports/VoucherLinesScreen";

export default function SalesScreen() {
  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: () => salesService.listSales(),
  });

  return (
    <VoucherLinesScreen
      emptyMessage="No sales match the selected filters."
      lines={salesQuery.data ?? []}
      isLoading={salesQuery.isLoading}
      isError={salesQuery.isError}
      isFetching={salesQuery.isFetching}
      groupByVoucher
      errorMessage={
        salesQuery.error instanceof Error
          ? salesQuery.error.message
          : "Failed to load sales"
      }
      onRefresh={() => {
        void salesQuery.refetch();
      }}
    />
  );
}
