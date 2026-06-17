import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportRow = Record<string, string | number | null | undefined>;

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(rows: ExportRow[], filename: string) {
  const csv = Papa.unparse(rows);
  trigger(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export function exportXlsx(rows: ExportRow[], filename: string, sheetName = "Dados") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  trigger(new Blob([out], { type: "application/octet-stream" }), `${filename}.xlsx`);
}

export function exportPdf(rows: ExportRow[], filename: string, title: string) {
  if (!rows.length) {
    const doc = new jsPDF();
    doc.text(title, 14, 18);
    doc.text("Sem dados.", 14, 30);
    doc.save(`${filename}.pdf`);
    return;
  }
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => (r[h] ?? "").toString()));
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("pt-BR"), 14, 22);
  autoTable(doc, {
    head: [headers],
    body,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${filename}.pdf`);
}
