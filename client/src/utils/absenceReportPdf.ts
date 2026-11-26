import { jsPDF } from 'jspdf';
import {
  ALL_REPORT_EMPLOYEES, formatReportDays, formatReportDuration, formatReportHours, getReportEmployeeName,
} from './absenceReport';
import type { AbsenceReport, ReportEmployeeSelection } from './absenceReport';

type PdfOptions = {
  employeeIds: ReportEmployeeSelection;
  employeeName: string;
  employeeEmail?: string;
  dateFrom: string;
  dateTo: string;
  typesLabel: string;
  statusLabel: string;
  typeLabels: Record<string, string>;
  statusLabels: Record<string, string>;
  includeReason: boolean;
  generatedAt?: Date;
};
type Column = { label: string; width: number };

const toPdfText = (value: string | number) => String(value).replace(/ł/g, 'l').replace(/Ł/g, 'L')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const formatDate = (value: string) => value ? value.split('-').reverse().join('.') : '-';

export function createAbsenceReportPdf(report: AbsenceReport, options: PdfOptions) {
  if (report.invalidRange) throw new Error('Data początkowa nie może być późniejsza niż końcowa.');
  const allEmployees = options.employeeIds === ALL_REPORT_EMPLOYEES;
  if (!allEmployees && options.employeeIds.length === 0) throw new Error('Wybierz co najmniej jednego pracownika.');
  const groupedEmployees = allEmployees || options.employeeIds.length > 1;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  const generatedAt = (options.generatedAt || new Date()).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
  let y = 14;

  const header = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('ERP ITComplete', margin, y);
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text(toPdfText(groupedEmployees ? 'Zbiorczy raport nieobecności' : 'Raport wniosków urlopowych'), margin, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(toPdfText(`Wygenerowano: ${generatedAt}`), margin + width, y, { align: 'right' });
    doc.setDrawColor(247, 148, 29);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 13, margin + width, y + 13);
    y += 21;
  };
  const newPage = () => { doc.addPage(); y = 14; header(); };
  const ensureSpace = (height: number) => { if (y + height > bottom) newPage(); };
  const section = (title: string) => {
    ensureSpace(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(toPdfText(title), margin, y + 5);
    y += 10;
  };
  const tableHeader = (columns: Column[]) => {
    doc.setFillColor(31, 41, 55);
    doc.rect(margin, y, width, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    let x = margin;
    for (const column of columns) {
      doc.text(toPdfText(column.label), x + 2, y + 6);
      x += column.width;
    }
    y += 9;
  };
  const table = (columns: Column[], rows: string[][]) => {
    ensureSpace(20);
    tableHeader(columns);
    rows.forEach((row, rowIndex) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const cells = row.map((cell, index) => doc.splitTextToSize(toPdfText(cell), columns[index].width - 4) as string[]);
      let offset = 0;
      const totalLines = Math.max(...cells.map(lines => lines.length), 1);
      while (offset < totalLines) {
        const remainingHeight = Math.max(9, (totalLines - offset) * 3.6 + 5);
        if ((remainingHeight <= bottom - 44 && y + remainingHeight > bottom) || bottom - y < 9) {
          newPage();
          tableHeader(columns);
        }
        const lineCount = Math.min(totalLines - offset, Math.floor((bottom - y - 5) / 3.6));
        const height = Math.max(9, lineCount * 3.6 + 5);
        doc.setDrawColor(229, 231, 235);
        const fill = rowIndex % 2 === 0 ? 255 : 250;
        doc.setFillColor(fill, fill, fill);
        doc.rect(margin, y, width, height, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(55, 65, 81);
        let x = margin;
        cells.forEach((lines, index) => {
          const chunk = lines.slice(offset, offset + lineCount);
          chunk.forEach((line, lineIndex) => doc.text(line, x + 2, y + 5 + lineIndex * 3.6));
          x += columns[index].width;
        });
        y += height;
        offset += lineCount;
      }
    });
    y += 6;
  };

  header();
  const summaries = [
    { label: groupedEmployees ? 'Pracownicy' : 'Pracownik', value: options.employeeName,
      sub: groupedEmployees ? `Osoby w raporcie: ${report.employees.length}` : options.employeeEmail || '', width: 68 },
    { label: 'Zakres', value: `${formatDate(options.dateFrom)} - ${formatDate(options.dateTo)}`, sub: '', width: 52 },
    { label: 'Rodzaje', value: options.typesLabel, sub: options.statusLabel, width: 67 },
    { label: 'Wnioski', value: String(report.entries.length), sub: '', width: 35 },
    { label: 'Razem', value: formatReportDuration({ days: report.totalDays, hours: report.totalHours }), sub: '', width: 39 },
  ].map(item => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(toPdfText(item.value), item.width - 6) as string[];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const subLines = item.sub ? doc.splitTextToSize(toPdfText(item.sub), item.width - 6) as string[] : [];
    return { ...item, lines, subLines };
  });
  const summaryHeight = Math.max(18, ...summaries.map(item => 13 + item.lines.length * 4 + item.subLines.length * 3));
  let x = margin;
  for (const summary of summaries) {
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, y, summary.width, summaryHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(toPdfText(summary.label.toUpperCase()), x + 3, y + 5);
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    summary.lines.forEach((line, index) => doc.text(line, x + 3, y + 10 + index * 4));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    summary.subLines.forEach((line, index) => doc.text(line, x + 3, y + 11 + summary.lines.length * 4 + index * 3));
    x += summary.width + 3;
  }
  y += summaryHeight + 7;

  if (groupedEmployees && report.employees.length > 0) {
    section('Podsumowanie pracowników');
    table([
      { label: 'Pracownik', width: 65 }, { label: 'Rodzaje nieobecności', width: 100 },
      { label: 'Wnioski', width: 25 }, { label: 'Dni', width: 43 }, { label: 'Godziny', width: 40 },
    ], report.employees.map(row => [
      getReportEmployeeName(row.employee),
      row.types.map(type => `${options.typeLabels[type.type] || type.type}: ${formatReportDuration(type)}`).join('\n'),
      String(row.requests), formatReportDays(row.days), formatReportHours(row.hours),
    ]));
    section('Szczegóły wniosków');
  }

  const columns: Column[] = groupedEmployees
    ? options.includeReason
      ? [{ label: 'Lp.', width: 9 }, { label: 'Pracownik', width: 45 }, { label: 'Rodzaj nieobecności', width: 48 },
        { label: 'Od', width: 23 }, { label: 'Do', width: 23 }, { label: 'Wymiar', width: 30 },
        { label: 'Status', width: 25 }, { label: 'Powód', width: 70 }]
      : [{ label: 'Lp.', width: 10 }, { label: 'Pracownik', width: 60 }, { label: 'Rodzaj nieobecności', width: 65 },
        { label: 'Od', width: 30 }, { label: 'Do', width: 30 }, { label: 'Wymiar', width: 40 }, { label: 'Status', width: 38 }]
    : options.includeReason
      ? [{ label: 'Lp.', width: 10 }, { label: 'Rodzaj nieobecności', width: 73 }, { label: 'Od', width: 24 },
        { label: 'Do', width: 24 }, { label: 'Wymiar', width: 30 }, { label: 'Status', width: 30 }, { label: 'Powód', width: 82 }]
      : [{ label: 'Lp.', width: 10 }, { label: 'Rodzaj nieobecności', width: 110 }, { label: 'Od', width: 34 },
        { label: 'Do', width: 34 }, { label: 'Wymiar', width: 42 }, { label: 'Status', width: 43 }];
  const rows = report.entries.map((entry, index) => [
    String(index + 1), ...(groupedEmployees ? [getReportEmployeeName(entry.employee)] : []),
    options.typeLabels[entry.type] || entry.type, formatDate(entry.dateFrom), formatDate(entry.dateTo),
    formatReportDuration(entry), options.statusLabels[entry.request.status] || entry.request.status,
    ...(options.includeReason ? [entry.request.reason || '-'] : []),
  ]);
  if (rows.length > 0) table(columns, rows);
  else {
    ensureSpace(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(toPdfText('Brak wniosków spełniających wybrane kryteria.'), margin, y + 5);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(`Strona ${page} / ${pages}`, margin + width, bottom + 7, { align: 'right' });
  }
  const name = allEmployees ? 'wszyscy-pracownicy' : groupedEmployees ? 'wybrani-pracownicy' : toPdfText(options.employeeName).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'pracownik';
  return { doc, fileName: `wnioski-urlopowe-${name}-${options.dateFrom || 'od'}-${options.dateTo || 'do'}.pdf` };
}
