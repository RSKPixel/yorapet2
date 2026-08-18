import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type StockWisePnlPdfMeta = {
  companyName?: string;
  companyAddress?: string;
  companyGstin?: string;
  periodLabel: string;
  dateFrom?: string;
  dateTo?: string;
  showLabel?: string;
  stockGroup?: string;
  stockItems?: string;
};

export type StockWisePnlPdfTable = {
  head: string[];
  body: string[][];
  foot: string[];
  numericColumnIndexes: number[];
};

const MARGIN = 12;

function formatIsoDate(value: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function addMetaLine(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  const text = value.trim();
  if (!text) {
    return y;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`${label}:`, x, y);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(text, maxWidth - 28);
  doc.text(lines, x + 28, y);
  return y + Math.max(4.5, lines.length * 4.5);
}

export function getStockWisePnlPdfFileName(
  periodLabel: string,
  dateFrom?: string,
  dateTo?: string,
) {
  if (periodLabel === "All sales" || !dateFrom || !dateTo) {
    return "stock-wise-pnl-all-sales.pdf";
  }
  return `stock-wise-pnl-${dateFrom}_${dateTo}.pdf`;
}

function buildStockWisePnlPdf(meta: StockWisePnlPdfMeta, table: StockWisePnlPdfTable) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN + 2;

  const companyName = meta.companyName?.trim() || "Stock Wise P&L";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(companyName, pageWidth / 2, y, { align: "center" });
  y += 6;

  if (meta.companyAddress?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const addressLines = doc.splitTextToSize(
      meta.companyAddress.trim(),
      contentWidth * 0.85,
    );
    doc.text(addressLines, pageWidth / 2, y, { align: "center" });
    y += addressLines.length * 4 + 1;
  }

  if (meta.companyGstin?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`GSTIN: ${meta.companyGstin.trim()}`, pageWidth / 2, y, {
      align: "center",
    });
    y += 5;
  }

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("Stock Wise P&L", pageWidth / 2, y, { align: "center" });
  y += 8;

  const periodText =
    meta.periodLabel === "All sales" || !meta.dateFrom || !meta.dateTo
      ? "All sales"
      : `${meta.periodLabel} (${formatIsoDate(meta.dateFrom)} – ${formatIsoDate(meta.dateTo)})`;

  y = addMetaLine(doc, "Period", periodText, MARGIN, y, contentWidth);
  if (meta.showLabel) {
    y = addMetaLine(doc, "Show", meta.showLabel, MARGIN, y, contentWidth);
  }
  if (meta.stockGroup) {
    y = addMetaLine(doc, "Stock group", meta.stockGroup, MARGIN, y, contentWidth);
  }
  if (meta.stockItems) {
    y = addMetaLine(doc, "Stock items", meta.stockItems, MARGIN, y, contentWidth);
  }

  y += 2;
  const numeric = new Set(table.numericColumnIndexes);

  autoTable(doc, {
    startY: y,
    tableWidth: contentWidth,
    head: [table.head],
    body: table.body,
    foot: [table.foot],
    showFoot: "lastPage",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 1.2,
      valign: "top",
      overflow: "linebreak",
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [35, 45, 60],
      textColor: 255,
      valign: "middle",
    },
    footStyles: {
      fontStyle: "bold",
      fillColor: [245, 245, 245],
      textColor: [20, 20, 20],
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.34 },
      1: { cellWidth: contentWidth * 0.16 },
    },
    didParseCell: (data) => {
      if (numeric.has(data.column.index)) {
        data.cell.styles.halign = "right";
      }
    },
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const footerY = doc.internal.pageSize.getHeight() - 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, footerY, {
        align: "center",
      });
      doc.setTextColor(0, 0, 0);
    },
  });

  return {
    doc,
    fileName: getStockWisePnlPdfFileName(
      meta.periodLabel,
      meta.dateFrom,
      meta.dateTo,
    ),
  };
}

export function createStockWisePnlPdfBlob(
  meta: StockWisePnlPdfMeta,
  table: StockWisePnlPdfTable,
): { blob: Blob; fileName: string } {
  const { doc, fileName } = buildStockWisePnlPdf(meta, table);
  return { blob: doc.output("blob"), fileName };
}
