import { jsPDF } from "jspdf";
import type { ProjectRow } from "../types/project";

export function generatePropertyPdf(row: ProjectRow): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 48;
  const marginRight = 48;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(26, 122, 60);
  doc.rect(0, 0, pageWidth, 64, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Chase Pays Cash — Property Report", marginLeft, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Shell Report  •  No Data Linked", marginLeft, 54);

  // ── Property name / address block ───────────────────────────────────────────
  let y = 86;

  const propertyName = row.name ?? "Unnamed Project";
  const propertyAddress =
    row.full_address ??
    [row.address_1, row.address_2].filter(Boolean).join(" ") ??
    "—";

  doc.setTextColor(26, 122, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(propertyName, marginLeft, y);
  y += 20;

  doc.setTextColor(90, 112, 96);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(propertyAddress, marginLeft, y);
  y += 24;

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(212, 232, 216);
  doc.setLineWidth(1);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 18;

  // ── Section label ───────────────────────────────────────────────────────────
  doc.setTextColor(26, 122, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PROPERTY DETAILS", marginLeft, y);
  y += 14;

  // ── Metrics grid (2 columns) ─────────────────────────────────────────────────
  const metrics: Array<{ label: string; value: string }> = [
    { label: "Property Address",                    value: propertyAddress },
    { label: "List Price/Asking Price",             value: "—" },
    { label: "Year Built",                          value: row.year_built ?? "—" },
    { label: "Square Footage",                      value: row.square_feet ?? "—" },
    { label: "Water Heater (New or Age)",           value: "—" },
    { label: "Roof (New or Age)",                   value: "—" },
    { label: "Appliances (New or Age)",             value: "—" },
    { label: "Gas Appliances",                      value: "—" },
    { label: "Electric Appliances",                 value: "—" },
    { label: "Fireplace (Gas Logs or Wood Burning)", value: "—" },
    { label: "Lot Size (Acres)",                    value: "—" },
    { label: "Bedrooms",                            value: row.beds ?? "—" },
    { label: "Bathrooms",                           value: row.baths ?? "—" },
    { label: "Sewer / Septic",                      value: "—" },
    { label: "HVAC (New or Age)",                   value: "—" },
    { label: "Plumbing (New or Partial Update)",    value: "—" },
    { label: "Electrical Panel Update",             value: "—" },
    { label: "Electrical Wiring Update",            value: "—" },
    { label: "Deck Update Front",                   value: "—" },
    { label: "Deck Update Back",                    value: "—" },
    { label: "Garage Door Motors Update",           value: "—" },
    { label: "Garage Doors Update",                 value: "—" },
    { label: "Foundation Work Completed",           value: "—" },
    { label: "Counter Top (Granite or Quartz)",     value: "—" },
    { label: "Windows Update",                      value: "—" },
  ];

  const colWidth = contentWidth / 2;
  const rowHeight = 36;
  const cellPadX = 10;
  const cellPadY = 10;

  metrics.forEach((metric, idx) => {
    const col = idx % 2;
    const rowIndex = Math.floor(idx / 2);
    const x = marginLeft + col * colWidth;
    const cellY = y + rowIndex * rowHeight;

    // Alternating row shading
    if (rowIndex % 2 === 0) {
      doc.setFillColor(240, 247, 241);
      doc.rect(x, cellY, colWidth, rowHeight, "F");
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, cellY, colWidth, rowHeight, "F");
    }

    // Cell border
    doc.setDrawColor(212, 232, 216);
    doc.setLineWidth(0.5);
    doc.rect(x, cellY, colWidth, rowHeight, "S");

    // Label
    doc.setTextColor(90, 112, 96);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${idx + 1}. ${metric.label.toUpperCase()}`, x + cellPadX, cellY + cellPadY + 1);

    // Value
    doc.setTextColor(26, 46, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(metric.value, x + cellPadX, cellY + cellPadY + 14);
  });

  // Move y below the grid
  const gridRows = Math.ceil(metrics.length / 2);
  y += gridRows * rowHeight + 20;

  // ── Notes section (add page if needed) ──────────────────────────────────────
  const notesLabelHeight = 20;
  const notesInstructionHeight = 16;
  const noteLineCount = 7;
  const noteLineSpacing = 24;
  const notesSectionHeight = notesLabelHeight + notesInstructionHeight + noteLineCount * noteLineSpacing + 12;

  if (y + notesSectionHeight > doc.internal.pageSize.getHeight() - 80) {
    doc.addPage();
    y = 48;
  }

  doc.setTextColor(26, 122, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("NOTES", marginLeft, y);
  y += notesLabelHeight;

  doc.setTextColor(90, 112, 96);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    "Reference metrics by number (e.g., #5 — Water heater replaced in 2022)",
    marginLeft,
    y,
  );
  y += notesInstructionHeight;

  doc.setDrawColor(212, 232, 216);
  doc.setLineWidth(0.5);
  for (let i = 0; i < noteLineCount; i++) {
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += noteLineSpacing;
  }

  y += 12;

  // ── Footer ──────────────────────────────────────────────────────────────────
  const lastPageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(240, 247, 241);
  doc.rect(0, lastPageHeight - 36, pageWidth, 36, "F");

  doc.setTextColor(90, 112, 96);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  const footerText = `Generated on ${new Date().toLocaleDateString()} — Shell Report (No Data Linked)`;
  doc.text(footerText, marginLeft, lastPageHeight - 15);

  // ── Save ────────────────────────────────────────────────────────────────────
  const safeName = (row.name ?? "Property").replace(/[^a-zA-Z0-9_\- ]/g, "_");
  doc.save(`Property_Report_${safeName}.pdf`);
}
