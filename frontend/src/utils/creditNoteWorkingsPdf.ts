import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type PdfCell =
  | string
  | {
      content: string;
      colSpan?: number;
      styles?: {
        fontStyle?: "bold" | "normal";
        fillColor?: [number, number, number];
        textColor?: [number, number, number];
        halign?: "left" | "center" | "right";
      };
    };

export type CreditNoteWorkingsPdfMeta = {
  companyName?: string;
  companyAddress?: string;
  companyGstin?: string;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  vendor?: string;
};

export type CreditNoteWorkingsPdfTable = {
  head: string[];
  body: PdfCell[][];
  foot: string[];
  numericColumnIndexes: number[];
  subtotalRowIndexes: number[];
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

export function getCreditNoteWorkingsPdfFileName(dateFrom: string, dateTo: string) {
  const from = dateFrom || "from";
  const to = dateTo || "to";
  return `credit-note-workings-${from}_${to}.pdf`;
}

export function groupHeaderRow(
  label: string,
  rowCount: number,
  colSpan: number,
): PdfCell[] {
  const noun = rowCount === 1 ? "stock group" : "stock groups";
  return [
    {
      content: `${label}  (${rowCount} ${noun})`,
      colSpan,
      styles: {
        fontStyle: "bold",
        fillColor: [235, 235, 235],
        textColor: [20, 20, 20],
        halign: "left",
      },
    },
  ];
}

function buildCreditNoteWorkingsPdf(
  meta: CreditNoteWorkingsPdfMeta,
  table: CreditNoteWorkingsPdfTable,
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN + 2;

  const companyName = meta.companyName?.trim() || "Credit Note Workings";
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
  doc.text("Credit Note Workings", pageWidth / 2, y, { align: "center" });
  y += 8;

  const periodText =
    meta.periodLabel === "Custom"
      ? `${formatIsoDate(meta.dateFrom)} – ${formatIsoDate(meta.dateTo)}`
      : `${meta.periodLabel} (${formatIsoDate(meta.dateFrom)} – ${formatIsoDate(meta.dateTo)})`;

  y = addMetaLine(doc, "Period", periodText, MARGIN, y, contentWidth);
  y = addMetaLine(doc, "Grouped by", "Month", MARGIN, y, contentWidth);
  if (meta.vendor) {
    y = addMetaLine(doc, "Vendor", meta.vendor, MARGIN, y, contentWidth);
  }

  y += 2;
  const numeric = new Set(table.numericColumnIndexes);
  const subtotals = new Set(table.subtotalRowIndexes);

  autoTable(doc, {
    startY: y,
    head: [table.head],
    body: table.body,
    foot: [table.foot],
    showFoot: "lastPage",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 1.8,
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
    didParseCell: (data) => {
      if (numeric.has(data.column.index) && data.section !== "head") {
        data.cell.styles.halign = "right";
      }
      if (data.section === "body" && subtotals.has(data.row.index)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [248, 248, 248];
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
    fileName: getCreditNoteWorkingsPdfFileName(meta.dateFrom, meta.dateTo),
  };
}

export function createCreditNoteWorkingsPdfBlob(
  meta: CreditNoteWorkingsPdfMeta,
  table: CreditNoteWorkingsPdfTable,
): { blob: Blob; fileName: string } {
  const { doc, fileName } = buildCreditNoteWorkingsPdf(meta, table);
  return { blob: doc.output("blob"), fileName };
}
