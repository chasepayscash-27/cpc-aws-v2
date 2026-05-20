import { AcroFormTextField, jsPDF } from "jspdf";
import type { ProjectRow } from "../types/project";

export function generatePropertyPdf(row: ProjectRow): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 48;
  const marginRight = 48;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const footerHeight = 36;
  const footerInset = 24;
  const contentBottom = pageHeight - footerHeight - footerInset;

  const propertyName = row.name ?? "Unnamed Project";
  const propertyAddress =
    row.full_address ??
    [row.address_1, row.address_2].filter(Boolean).join(" ") ??
    "—";

  const metrics: Array<{ label: string; value: string; fieldName: string }> = [
    { label: "Property Address", value: propertyAddress, fieldName: "property_address" },
    { label: "List Price/Asking Price", value: "", fieldName: "list_price" },
    { label: "Year Built", value: row.year_built ?? "", fieldName: "year_built" },
    {
      label: "Square Footage",
      value: row.square_feet && !isNaN(Number(row.square_feet)) ? Number(row.square_feet).toLocaleString() : row.square_feet ?? "",
      fieldName: "square_footage",
    },
    { label: "Water Heater (New or Age)", value: "", fieldName: "water_heater" },
    { label: "Roof (New or Age)", value: "", fieldName: "roof" },
    { label: "Appliances (New or Age)", value: "", fieldName: "appliances" },
    { label: "Gas Appliances", value: "", fieldName: "gas_appliances" },
    { label: "Electric Appliances", value: "", fieldName: "electric_appliances" },
    { label: "Fireplace (Gas Logs or Wood Burning)", value: "", fieldName: "fireplace" },
    { label: "Lot Size (Acres)", value: "", fieldName: "lot_size_acres" },
    { label: "Bedrooms", value: row.beds ?? "", fieldName: "bedrooms" },
    { label: "Bathrooms", value: row.baths ?? "", fieldName: "bathrooms" },
    { label: "Sewer / Septic", value: "", fieldName: "sewer_septic" },
    { label: "HVAC (New or Age)", value: "", fieldName: "hvac" },
    { label: "Plumbing (New or Partial Update)", value: "", fieldName: "plumbing" },
    { label: "Electrical Panel Update", value: "", fieldName: "electrical_panel" },
    { label: "Electrical Wiring Update", value: "", fieldName: "electrical_wiring" },
    { label: "Deck Update Front", value: "", fieldName: "deck_front" },
    { label: "Deck Update Back", value: "", fieldName: "deck_back" },
    { label: "Garage Door Motors Update", value: "", fieldName: "garage_door_motors" },
    { label: "Garage Doors Update", value: "", fieldName: "garage_doors" },
    { label: "Foundation Work Completed", value: "", fieldName: "foundation_work" },
    { label: "Counter Top (Granite or Quartz)", value: "", fieldName: "counter_top" },
    { label: "Windows Update", value: "", fieldName: "windows_update" },
  ];

  const colWidth = contentWidth / 2;
  const cellPadX = 10;
  const cellPadTop = 8;
  const cellPadBottom = 8;
  const fieldHeight = 18;
  const labelLineHeight = 8;
  const labelWidth = colWidth - cellPadX * 2;
  const dividerColor: [number, number, number] = [212, 232, 216];

  const drawFooter = () => {
    doc.setFillColor(240, 247, 241);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, "F");

    doc.setTextColor(90, 112, 96);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} — Editable Property Worksheet`,
      marginLeft,
      pageHeight - 15,
    );
  };

  const drawHeader = (sectionLabel: string) => {
    doc.setFillColor(26, 122, 60);
    doc.rect(0, 0, pageWidth, 64, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Chase Pays Cash — Property Report", marginLeft, 38);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Editable worksheet  •  fill in or revise any metric", marginLeft, 54);

    let nextY = 86;

    doc.setTextColor(26, 122, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(propertyName, marginLeft, nextY);
    nextY += 20;

    doc.setTextColor(90, 112, 96);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const addressLines = doc.splitTextToSize(propertyAddress, contentWidth);
    doc.text(addressLines, marginLeft, nextY);
    nextY += addressLines.length * 13 + 10;

    doc.setDrawColor(...dividerColor);
    doc.setLineWidth(1);
    doc.line(marginLeft, nextY, pageWidth - marginRight, nextY);
    nextY += 18;

    doc.setTextColor(26, 122, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(sectionLabel, marginLeft, nextY);

    return nextY + 14;
  };

  const addTextField = (config: {
    fieldName: string;
    value: string;
    x: number;
    y: number;
    width: number;
    height: number;
    multiline?: boolean;
    fontSize?: number;
  }) => {
    const field = new AcroFormTextField();
    field.fieldName = config.fieldName;
    field.value = config.value;
    field.defaultValue = config.value;
    field.x = config.x;
    field.y = config.y;
    field.width = config.width;
    field.height = config.height;
    field.fontSize = config.fontSize ?? 10;
    field.fontName = "helvetica";
    field.fontStyle = "normal";
    field.color = "#1a2e1a";
    field.textAlign = "left";
    field.multiline = config.multiline ?? false;
    field.doNotScroll = false;
    field.doNotSpellCheck = false;
    doc.addField(field);
  };

  let y = drawHeader("PROPERTY DETAILS");

  for (let rowIndex = 0; rowIndex < Math.ceil(metrics.length / 2); rowIndex += 1) {
    const rowMetrics = metrics.slice(rowIndex * 2, rowIndex * 2 + 2);
    const rowHeight =
      Math.max(
        ...rowMetrics.map((metric, offset) => {
          const labelLines = doc.splitTextToSize(
            `${rowIndex * 2 + offset + 1}. ${metric.label.toUpperCase()}`,
            labelWidth,
          );
          return cellPadTop + labelLines.length * labelLineHeight + 6 + fieldHeight + cellPadBottom;
        }),
      ) + 2;

    if (y + rowHeight > contentBottom) {
      drawFooter();
      doc.addPage();
      y = drawHeader("PROPERTY DETAILS (CONTINUED)");
    }

    rowMetrics.forEach((metric, col) => {
      const x = marginLeft + col * colWidth;
      const labelLines = doc.splitTextToSize(
        `${rowIndex * 2 + col + 1}. ${metric.label.toUpperCase()}`,
        labelWidth,
      );
      const fieldY = y + cellPadTop + labelLines.length * labelLineHeight + 4;

      doc.setFillColor(rowIndex % 2 === 0 ? 240 : 255, rowIndex % 2 === 0 ? 247 : 255, rowIndex % 2 === 0 ? 241 : 255);
      doc.rect(x, y, colWidth, rowHeight, "F");

      doc.setDrawColor(...dividerColor);
      doc.setLineWidth(0.5);
      doc.rect(x, y, colWidth, rowHeight, "S");

      doc.setTextColor(90, 112, 96);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(labelLines, x + cellPadX, y + cellPadTop + 1);

      addTextField({
        fieldName: metric.fieldName,
        value: metric.value,
        x: x + cellPadX,
        y: fieldY,
        width: colWidth - cellPadX * 2,
        height: fieldHeight,
      });
    });

    y += rowHeight;
  }

  y += 20;

  const notesLabelHeight = 20;
  const notesInstructionHeight = 16;
  const notesFieldHeight = 170;
  const notesSectionHeight = notesLabelHeight + notesInstructionHeight + notesFieldHeight + 12;

  if (y + notesSectionHeight > contentBottom) {
    drawFooter();
    doc.addPage();
    y = drawHeader("NOTES");
  } else {
    doc.setTextColor(26, 122, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOTES", marginLeft, y);
    y += notesLabelHeight;
  }

  doc.setTextColor(90, 112, 96);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    "Reference metrics by number (e.g., #5 — Water heater replaced in 2022)",
    marginLeft,
    y,
  );
  y += notesInstructionHeight;

  doc.setDrawColor(...dividerColor);
  doc.setLineWidth(0.75);
  doc.rect(marginLeft, y, contentWidth, notesFieldHeight, "S");

  addTextField({
    fieldName: "notes",
    value: "",
    x: marginLeft + 8,
    y: y + 8,
    width: contentWidth - 16,
    height: notesFieldHeight - 16,
    multiline: true,
    fontSize: 10,
  });

  drawFooter();

  // ── Save ────────────────────────────────────────────────────────────────────
  const safeName = (row.name ?? "Property").replace(/[^a-zA-Z0-9_\- ]/g, "_");
  doc.save(`Property_Report_${safeName}.pdf`);
}
