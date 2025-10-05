// This file assumes that the required libraries (xlsx, jspdf, jspdf-autotable) are loaded globally via script tags in index.html

declare var XLSX: any;
declare var jspdf: any;

export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPdf = (title: string, head: string[][], body: any[][], fileName: string) => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.text(title, 14, 16);
  (doc as any).autoTable({
    head: head,
    body: body,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 123, 255] }
  });

  doc.save(`${fileName}.pdf`);
};