import * as XLSX from "xlsx";

export interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: ExcelRow[],
) {
  try {
    // Convert rows to array format matching headers
    const data = rows.map((row) => headers.map((header) => row[header] ?? ""));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Set column widths
    const columnWidths = headers.map(() => 15);
    worksheet["!cols"] = columnWidths.map((width) => ({ wch: width }));

    // Write file
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Failed to export to Excel");
  }
}

export function exportRegistrationsToExcel(
  filename: string,
  registrations: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    ageCategory?: string;
    sex?: string;
    visitorStatus?: string;
    leadershipRole?: string;
    status: string;
    registeredAt: string;
  }>,
) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Age Category",
    "Gender",
    "Visitor Status",
    "Leadership Role",
    "Attendance Status",
    "Registered Date",
  ];

  const rows: ExcelRow[] = registrations.map((reg) => ({
    Name: reg.name,
    Email: reg.email || "—",
    Phone: reg.phone || "—",
    "Age Category": reg.ageCategory ? reg.ageCategory.replace("_", " ") : "—",
    Gender: reg.sex ? (reg.sex === "male" ? "Male" : "Female") : "—",
    "Visitor Status": reg.visitorStatus ? reg.visitorStatus.replace("_", " ") : "—",
    "Leadership Role": reg.leadershipRole ? reg.leadershipRole.replace("_", " ") : "—",
    "Attendance Status": formatStatus(reg.status),
    "Registered Date": new Date(reg.registeredAt).toLocaleDateString(),
  }));

  exportToExcel(filename, "Attendees", headers, rows);
}

function formatStatus(status: string): string {
  switch (status) {
    case "checked_in":
      return "Checked In";
    case "registered":
      return "Registered";
    case "no_show":
      return "No-Show";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
