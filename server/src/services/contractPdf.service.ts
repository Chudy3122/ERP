import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { Contract, ContractStatus } from '../models/Contract.model';

class ContractPdfService {
  private fontPath: string;

  constructor() {
    // Use DejaVu Sans for Polish character support
    this.fontPath = path.join(__dirname, '../assets/fonts/DejaVuSans.ttf');
  }

  /**
   * Generate contract PDF
   */
  async generateContractPdf(contract: Contract): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register font for Polish characters
      if (fs.existsSync(this.fontPath)) {
        doc.registerFont('DejaVu', this.fontPath);
        doc.font('DejaVu');
      }

      // Header
      this.renderHeader(doc, contract);

      // Contract details
      this.renderContractDetails(doc, contract);

      // Parties
      this.renderParties(doc, contract);

      // Description/Terms
      this.renderDescription(doc, contract);

      // Footer
      this.renderFooter(doc, contract);

      doc.end();
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, contract: Contract): void {
    // Title
    doc.fontSize(20).text('UMOWA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(`Nr ${contract.contract_number}`, { align: 'center' });
    doc.moveDown(2);
  }

  private renderContractDetails(doc: PDFKit.PDFDocument, contract: Contract): void {
    const startY = doc.y;
    const leftColumn = 50;
    const rightColumn = 300;

    // Left column
    doc.fontSize(10);
    doc.text('Tytuł:', leftColumn, startY, { continued: true }).text(` ${contract.title}`);
    doc.moveDown(0.5);

    doc.text('Status:', leftColumn, doc.y, { continued: true }).text(
      ` ${this.getStatusLabel(contract.status)}`
    );
    doc.moveDown(0.5);

    doc.text('Data rozpoczęcia:', leftColumn, doc.y, { continued: true }).text(
      ` ${this.formatDate(contract.start_date)}`
    );
    doc.moveDown(0.5);

    doc.text('Data zakończenia:', leftColumn, doc.y, { continued: true }).text(
      ` ${this.formatDate(contract.end_date)}`
    );
    doc.moveDown(0.5);

    if (contract.value) {
      doc.text('Wartość umowy:', leftColumn, doc.y, { continued: true }).text(
        ` ${this.formatMoney(contract.value)} ${contract.currency}`
      );
      doc.moveDown(0.5);
    }

    if (contract.auto_renew) {
      doc.text('Automatyczne odnowienie:', leftColumn, doc.y, { continued: true }).text(' Tak');
      doc.moveDown(0.5);
      doc.text('Dni na wypowiedzenie:', leftColumn, doc.y, { continued: true }).text(
        ` ${contract.renewal_notice_days}`
      );
    }

    doc.moveDown(2);
  }

  private renderParties(doc: PDFKit.PDFDocument, contract: Contract): void {
    doc.fontSize(12).text('STRONY UMOWY', { underline: true });
    doc.moveDown();

    doc.fontSize(10);

    // Client info
    doc.text('Zamawiający:', { continued: false });
    doc.moveDown(0.3);
    if (contract.client) {
      doc.text(`  ${contract.client.name}`);
      if (contract.client.street) {
        doc.text(`  ${contract.client.street}`);
      }
      if (contract.client.city) {
        const addressLine = [contract.client.postal_code, contract.client.city]
          .filter(Boolean)
          .join(' ');
        doc.text(`  ${addressLine}`);
      }
      if (contract.client.nip) {
        doc.text(`  NIP: ${contract.client.nip}`);
      }
      if (contract.client.email) {
        doc.text(`  E-mail: ${contract.client.email}`);
      }
    }

    doc.moveDown(2);
  }

  private renderDescription(doc: PDFKit.PDFDocument, contract: Contract): void {
    if (contract.description) {
      doc.fontSize(12).text('PRZEDMIOT UMOWY', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(contract.description, { align: 'justify' });
      doc.moveDown(2);
    }

    if (contract.payment_terms) {
      doc.fontSize(12).text('WARUNKI PŁATNOŚCI', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(contract.payment_terms, { align: 'justify' });
      doc.moveDown(2);
    }

    if (contract.notes) {
      doc.fontSize(12).text('UWAGI', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(contract.notes, { align: 'justify' });
      doc.moveDown(2);
    }
  }

  private renderFooter(doc: PDFKit.PDFDocument, contract: Contract): void {
    // Signature lines
    const pageBottom = doc.page.height - 150;
    if (doc.y > pageBottom - 100) {
      doc.addPage();
    }

    doc.y = Math.max(doc.y + 50, pageBottom - 100);

    doc.fontSize(10);

    const leftX = 50;
    const rightX = 350;
    const lineWidth = 150;

    // Left signature line
    doc
      .moveTo(leftX, doc.y)
      .lineTo(leftX + lineWidth, doc.y)
      .stroke();
    doc.text('Zamawiający', leftX, doc.y + 5, { width: lineWidth, align: 'center' });

    // Right signature line
    doc
      .moveTo(rightX, doc.y - 15)
      .lineTo(rightX + lineWidth, doc.y - 15)
      .stroke();
    doc.text('Wykonawca', rightX, doc.y - 10, { width: lineWidth, align: 'center' });

    // Generated date
    doc.moveDown(3);
    doc.fontSize(8).text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`, {
      align: 'right',
    });
  }

  private getStatusLabel(status: ContractStatus): string {
    const labels: Record<ContractStatus, string> = {
      [ContractStatus.DRAFT]: 'Szkic',
      [ContractStatus.PENDING]: 'Oczekująca',
      [ContractStatus.ACTIVE]: 'Aktywna',
      [ContractStatus.EXPIRED]: 'Wygasła',
      [ContractStatus.TERMINATED]: 'Rozwiązana',
      [ContractStatus.RENEWED]: 'Odnowiona',
    };
    return labels[status] || status;
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pl-PL');
  }

  private formatMoney(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}

export default new ContractPdfService();
