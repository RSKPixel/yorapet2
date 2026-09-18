import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OpenSettingsRoute } from "@/pages/OpenSettingsRoute";
import { TallyDataPage } from "@/pages/data/TallyDataPage";
import { InventoryMasterPage } from "@/pages/master/InventoryMasterPage";
import { CreditNoteWorkingsPage } from "@/pages/reports/CreditNoteWorkingsPage";
import { PurchasesReportPage } from "@/pages/reports/PurchasesReportPage";
import { SalesReportPage } from "@/pages/reports/SalesReportPage";
import { StockSummaryPage } from "@/pages/reports/StockSummaryPage";
import { StockWisePnlPage } from "@/pages/reports/StockWisePnlPage";
import { SectionPage } from "@/pages/SectionPage";
import { ProductionBlowingPage } from "@/pages/stock-movements/ProductionBlowingPage";
import { CostingPage } from "@/pages/transactions/CostingPage";
import { CreditNotePage } from "@/pages/transactions/CreditNotePage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="master/inventory" element={<InventoryMasterPage />} />
            <Route path="data/tally-data" element={<TallyDataPage />} />
            <Route
              path="stock-movements/stock-journal"
              element={<SectionPage section="Stock Movements" page="Stock Journal" />}
            />
            <Route
              path="stock-movements/blowing"
              element={<ProductionBlowingPage />}
            />
            <Route
              path="stock-movements/packing-materials"
              element={
                <SectionPage section="Stock Movements" page="Packing Materials" />
              }
            />
            <Route path="reports/stock-summary" element={<StockSummaryPage />} />
            <Route path="reports/stock-pnl" element={<StockWisePnlPage />} />
            <Route path="reports/sales" element={<SalesReportPage />} />
            <Route path="reports/purchases" element={<PurchasesReportPage />} />
            <Route
              path="reports/credit-note-workings"
              element={<CreditNoteWorkingsPage />}
            />
            <Route path="transactions/costing" element={<CostingPage />} />
            <Route path="transactions/credit-note" element={<CreditNotePage />} />
            <Route path="status" element={<OpenSettingsRoute tab="general" />} />
            <Route path="example-form" element={<Navigate to="/" replace />} />
            <Route
              path="settings/company-profile"
              element={<OpenSettingsRoute tab="companyProfile" />}
            />
            <Route path="settings" element={<OpenSettingsRoute />} />
            <Route path="users" element={<OpenSettingsRoute tab="users" />} />
            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
