import { useQuery } from "@tanstack/react-query";

import { purchasesService } from "@/api/purchases";
import { VoucherLinesScreen } from "@/components/reports/VoucherLinesScreen";

export default function PurchasesScreen() {
  const purchasesQuery = useQuery({
    queryKey: ["purchases"],
    queryFn: () => purchasesService.listPurchases(),
  });

  return (
    <VoucherLinesScreen
      emptyMessage="No purchases match the selected filters."
      lines={purchasesQuery.data ?? []}
      isLoading={purchasesQuery.isLoading}
      isError={purchasesQuery.isError}
      isFetching={purchasesQuery.isFetching}
      groupByVoucher
      errorMessage={
        purchasesQuery.error instanceof Error
          ? purchasesQuery.error.message
          : "Failed to load purchases"
      }
      onRefresh={() => {
        void purchasesQuery.refetch();
      }}
    />
  );
}
