import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import { Invoice } from '../models/Invoice.model';

// Paths to fonts with Polish character support
const FONTS_DIR = path.join(__dirname, '../assets/fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');

console.log('[PDF Service] Fonts directory:', FONTS_DIR);
console.log('[PDF Service] Font regular exists:', fs.existsSync(FONT_REGULAR), FONT_REGULAR);
console.log('[PDF Service] Font bold exists:', fs.existsSync(FONT_BOLD), FONT_BOLD);

interface CompanyInfo {
  name: string;
  nip: string;
  address: string;
  city: string;
  postalCode: string;
  phone?: string;
  email?: string;
  bankAccount?: string;
}

// Company information - can be moved to config/environment
const COMPANY_INFO: CompanyInfo = {
  name: 'Twoja Firma Sp. z o.o.',
  nip: '0000000000',
  address: 'ul. Przykładowa 1',
  city: 'Warszawa',
  postalCode: '00-000',
  phone: '+48 123 456 789',
  email: 'kontakt@twojafirma.pl',
  bankAccount: 'PL00 0000 0000 0000 0000 0000 0000',
};

export class InvoicePdfService {
  private doc: typeof PDFDocument.prototype;
  private pageWidth = 595.28; // A4 width in points
  private pageHeight = 841.89; // A4 height in points
  private margin = 50;
  private contentWidth: number;

  constructor() {
    this.contentWidth = this.pageWidth - 2 * this.margin;
  }

  /**
   * Generate PDF for invoice
   */
  async generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Check if font files exist
        if (!fs.existsSync(FONT_REGULAR)) {
          throw new Error(`Font file not found: ${FONT_REGULAR}`);
        }
        if (!fs.existsSync(FONT_BOLD)) {
          throw new Error(`Font file not found: ${FONT_BOLD}`);
        }

        const chunks: Buffer[] = [];

        this.doc = new PDFDocument({
          size: 'A4',
          margin: this.margin,
          info: {
            Title: `Faktura ${invoice.invoice_number}`,
            Author: COMPANY_INFO.name,
          },
        });

        this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        this.doc.on('end', () => resolve(Buffer.concat(chunks)));
        this.doc.on('error', (err: Error) => {
          console.error('[PDF Service] PDF generation error:', err);
          reject(err);
        });

        // Register fonts with Polish character support
        console.log('[PDF Service] Registering fonts...');
        this.doc.registerFont('DejaVuSans', FONT_REGULAR);
        this.doc.registerFont('DejaVuSans-Bold', FONT_BOLD);
        this.doc.font('DejaVuSans');
        console.log('[PDF Service] Fonts registered successfully');

        // Generate content
        this.drawHeader(invoice);
        this.drawParties(invoice);
        this.drawInvoiceDetails(invoice);
        this.drawItemsTable(invoice);
        this.drawSummary(invoice);
        this.drawPaymentInfo(invoice);
        this.drawFooter(invoice);

        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private drawHeader(invoice: Invoice) {
    const y = this.margin;

    // Company logo placeholder (left side)
    this.doc
      .fontSize(18)
      .font('DejaVuSans-Bold')
      .fillColor('#333333')
      .text(COMPANY_INFO.name, this.margin, y, { width: 250 });

    // Invoice title (right side)
    this.doc
      .fontSize(24)
      .fillColor('#1a1a1a')
      .text('FAKTURA VAT', this.margin + 300, y, { width: 200, align: 'right' });

    this.doc
      .fontSize(14)
      .font('DejaVuSans')
      .fillColor('#666666')
      .text(invoice.invoice_number, this.margin + 300, y + 30, { width: 200, align: 'right' });

    // Horizontal line
    this.doc
      .moveTo(this.margin, y + 60)
      .lineTo(this.pageWidth - this.margin, y + 60)
      .strokeColor('#e0e0e0')
      .lineWidth(1)
      .stroke();
  }

  private drawParties(invoice: Invoice) {
    const y = 130;
    const colWidth = (this.contentWidth - 40) / 2;

    // Seller (left column)
    this.doc
      .fontSize(10)
      .font('DejaVuSans-Bold')
      .fillColor('#666666')
      .text('SPRZEDAWCA', this.margin, y);

    this.doc
      .fontSize(11)
      .font('DejaVuSans-Bold')
      .fillColor('#1a1a1a')
      .text(COMPANY_INFO.name, this.margin, y + 15);

    this.doc
      .fontSize(10)
      .font('DejaVuSans')
      .fillColor('#333333')
      .text(`NIP: ${COMPANY_INFO.nip}`, this.margin, y + 30)
      .text(COMPANY_INFO.address, this.margin, y + 43)
      .text(`${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`, this.margin, y + 56);

    if (COMPANY_INFO.phone) {
      this.doc.text(`Tel: ${COMPANY_INFO.phone}`, this.margin, y + 69);
    }
    if (COMPANY_INFO.email) {
      this.doc.text(`Email: ${COMPANY_INFO.email}`, this.margin, y + 82);
    }

    // Buyer (right column)
    const rightX = this.margin + colWidth + 40;

    this.doc
      .fontSize(10)
      .font('DejaVuSans-Bold')
      .fillColor('#666666')
      .text('NABYWCA', rightX, y);

    if (invoice.client) {
      this.doc
        .fontSize(11)
        .font('DejaVuSans-Bold')
        .fillColor('#1a1a1a')
        .text(invoice.client.name, rightX, y + 15, { width: colWidth });

      this.doc
        .fontSize(10)
        .font('DejaVuSans')
        .fillColor('#333333');

      let clientY = y + 30;
      if (invoice.client.nip) {
        this.doc.text(`NIP: ${invoice.client.nip}`, rightX, clientY);
        clientY += 13;
      }
      if (invoice.client.street) {
        this.doc.text(invoice.client.street, rightX, clientY);
        clientY += 13;
      }
      if (invoice.client.city) {
        this.doc.text(`${invoice.client.postal_code || ''} ${invoice.client.city}`, rightX, clientY);
      }
    }
  }

  private drawInvoiceDetails(invoice: Invoice) {
    const y = 250;

    // Details box
    this.doc
      .rect(this.margin, y, this.contentWidth, 50)
      .fillColor('#f8f9fa')
      .fill();

    const boxY = y + 12;
    const colWidth = this.contentWidth / 4;

    // Issue date
    this.doc
      .fontSize(9)
      .font('DejaVuSans')
      .fillColor('#666666')
      .text('Data wystawienia', this.margin + 15, boxY);
    this.doc
      .fontSize(10)
      .font('DejaVuSans-Bold')
      .fillColor('#1a1a1a')
      .text(this.formatDate(invoice.issue_date), this.margin + 15, boxY + 12);

    // Sale date
    this.doc
      .fontSize(9)
      .font('DejaVuSans')
      .fillColor('#666666')
      .text('Data sprzedaży', this.margin + colWidth + 15, boxY);
    this.doc
      .fontSize(10)
      .font('DejaVuSans-Bold')
      .fillColor('#1a1a1a')
      .text(this.formatDate(invoice.sale_date || invoice.issue_date), this.margin + colWidth + 15, boxY + 12);

    // Due date
    this.doc
      .fontSize(9)
      .font('DejaVuSans')
      .fillColor('#666666')
      .text('Termin płatności', this.margin + colWidth * 2 + 15, boxY);
    this.doc
      .fontSize(10)
      .font('DejaVuSans-Bold')
      .fillColor('#1a1a1a')
      .text(this.formatDate(invoice.due_date), this.margin + colWidth * 2 + 15, boxY + 12);

    // Payment method
    this.doc
      .fontSize(9)
      .font('DejaVuSans')
      .fillColor('#666666')
      .text('Forma płatności', this.margin + colWidth * 3 + 15, boxY);
    this.doc
      .fontSize(10)
      .font('DejaVuSans-Bold')
      .fillColor('#1a1a1a')
      .text('Przelew', this.margin + colWidth * 3 + 15, boxY + 12);
  }

  private drawItemsTable(invoice: Invoice) {
    const startY = 320;
    const items = invoice.items || [];

    // Table header
    const columns = [
      { label: 'Lp.', width: 30, align: 'center' as const },
      { label: 'Nazwa towaru/usługi', width: 180, align: 'left' as const },
      { label: 'Ilość', width: 50, align: 'right' as const },
      { label: 'J.m.', width: 40, align: 'center' as const },
      { label: 'Cena netto', width: 70, align: 'right' as const },
      { label: 'VAT %', width: 45, align: 'center' as const },
      { label: 'Netto', width: 70, align: 'right' as const },
      { label: 'Brutto', width: 70, align: 'right' as const },
    ];

    let x = this.margin;

    // Header background
    this.doc
      .rect(this.margin, startY, this.contentWidth, 25)
      .fillColor('#2c3e50')
      .fill();

    // Header text
    this.doc.fontSize(8).font('DejaVuSans-Bold').fillColor('#ffffff');
    columns.forEach((col) => {
      this.doc.text(col.label, x + 3, startY + 8, { width: col.width - 6, align: col.align });
      x += col.width;
    });

    // Table rows
    let y = startY + 25;
    items.forEach((item, index) => {
      const rowHeight = 25;
      const isEven = index % 2 === 0;

      // Row background
      if (isEven) {
        this.doc
          .rect(this.margin, y, this.contentWidth, rowHeight)
          .fillColor('#f8f9fa')
          .fill();
      }

      x = this.margin;
      this.doc.fontSize(9).font('DejaVuSans').fillColor('#333333');

      // Lp.
      this.doc.text((index + 1).toString(), x + 3, y + 8, { width: columns[0].width - 6, align: 'center' });
      x += columns[0].width;

      // Description
      this.doc.text(item.description, x + 3, y + 8, { width: columns[1].width - 6, align: 'left' });
      x += columns[1].width;

      // Quantity
      this.doc.text(this.formatNumber(item.quantity, 3), x + 3, y + 8, { width: columns[2].width - 6, align: 'right' });
      x += columns[2].width;

      // Unit
      this.doc.text(item.unit, x + 3, y + 8, { width: columns[3].width - 6, align: 'center' });
      x += columns[3].width;

      // Unit price
      this.doc.text(this.formatMoney(item.unit_price_net), x + 3, y + 8, { width: columns[4].width - 6, align: 'right' });
      x += columns[4].width;

      // VAT rate
      this.doc.text(`${item.vat_rate}%`, x + 3, y + 8, { width: columns[5].width - 6, align: 'center' });
      x += columns[5].width;

      // Net amount
      this.doc.text(this.formatMoney(item.net_amount), x + 3, y + 8, { width: columns[6].width - 6, align: 'right' });
      x += columns[6].width;

      // Gross amount
      this.doc.text(this.formatMoney(item.gross_amount), x + 3, y + 8, { width: columns[7].width - 6, align: 'right' });

      y += rowHeight;
    });

    // Table border
    this.doc
      .rect(this.margin, startY, this.contentWidth, y - startY)
      .strokeColor('#dee2e6')
      .lineWidth(0.5)
      .stroke();

    return y;
  }

  private drawSummary(invoice: Invoice) {
    const y = 320 + ((invoice.items?.length || 0) + 1) * 25 + 20;
    const summaryX = this.pageWidth - this.margin - 200;

    // Summary box
    this.doc
      .rect(summaryX, y, 200, 80)
      .fillColor('#f8f9fa')
      .fill();

    this.doc.fontSize(10).font('DejaVuSans').fillColor('#666666');

    // Net total
    this.doc.text('Razem netto:', summaryX + 10, y + 10);
    this.doc.font('DejaVuSans-Bold').fillColor('#1a1a1a').text(
      `${this.formatMoney(invoice.net_total)} ${invoice.currency}`,
      summaryX + 100,
      y + 10,
      { width: 90, align: 'right' }
    );

    // VAT total
    this.doc.font('DejaVuSans').fillColor('#666666').text('Razem VAT:', summaryX + 10, y + 28);
    this.doc.font('DejaVuSans-Bold').fillColor('#1a1a1a').text(
      `${this.formatMoney(invoice.vat_total)} ${invoice.currency}`,
      summaryX + 100,
      y + 28,
      { width: 90, align: 'right' }
    );

    // Divider line
    this.doc
      .moveTo(summaryX + 10, y + 48)
      .lineTo(summaryX + 190, y + 48)
      .strokeColor('#dee2e6')
      .lineWidth(1)
      .stroke();

    // Gross total
    this.doc.fontSize(12).font('DejaVuSans-Bold').fillColor('#1a1a1a').text('DO ZAPŁATY:', summaryX + 10, y + 55);
    this.doc.text(
      `${this.formatMoney(invoice.gross_total)} ${invoice.currency}`,
      summaryX + 100,
      y + 55,
      { width: 90, align: 'right' }
    );

    // Amount in words
    const amountInWords = this.numberToWords(Number(invoice.gross_total), invoice.currency);
    this.doc
      .fontSize(9)
      .font('DejaVuSans')
      .fillColor('#666666')
      .text(`Słownie: ${amountInWords}`, this.margin, y + 90, { width: this.contentWidth });

    return y + 110;
  }

  private drawPaymentInfo(invoice: Invoice) {
    const y = 320 + ((invoice.items?.length || 0) + 1) * 25 + 130;

    // Bank account info
    this.doc
      .fontSize(10)
      .font('DejaVuSans-Bold')
      .fillColor('#1a1a1a')
      .text('Dane do przelewu:', this.margin, y);

    this.doc
      .fontSize(10)
      .font('DejaVuSans')
      .fillColor('#333333')
      .text(`Nr konta: ${COMPANY_INFO.bankAccount}`, this.margin, y + 15)
      .text(`Tytuł przelewu: ${invoice.invoice_number}`, this.margin, y + 30);

    // Notes
    if (invoice.notes) {
      this.doc
        .fontSize(10)
        .font('DejaVuSans-Bold')
        .fillColor('#1a1a1a')
        .text('Uwagi:', this.margin, y + 55);

      this.doc
        .fontSize(9)
        .font('DejaVuSans')
        .fillColor('#666666')
        .text(invoice.notes, this.margin, y + 70, { width: this.contentWidth });
    }
  }

  private drawFooter(invoice: Invoice) {
    const y = this.pageHeight - 100;

    // Signature lines
    const sigWidth = 150;

    this.doc
      .moveTo(this.margin, y)
      .lineTo(this.margin + sigWidth, y)
      .strokeColor('#999999')
      .lineWidth(0.5)
      .stroke();

    this.doc
      .fontSize(8)
      .font('DejaVuSans')
      .fillColor('#999999')
      .text('Podpis osoby upoważnionej', this.margin, y + 5, { width: sigWidth, align: 'center' })
      .text('do wystawienia faktury', this.margin, y + 15, { width: sigWidth, align: 'center' });

    this.doc
      .moveTo(this.pageWidth - this.margin - sigWidth, y)
      .lineTo(this.pageWidth - this.margin, y)
      .stroke();

    this.doc
      .text('Podpis osoby upoważnionej', this.pageWidth - this.margin - sigWidth, y + 5, { width: sigWidth, align: 'center' })
      .text('do odbioru faktury', this.pageWidth - this.margin - sigWidth, y + 15, { width: sigWidth, align: 'center' });

    // Footer note
    this.doc
      .fontSize(7)
      .fillColor('#aaaaaa')
      .text(
        'Faktura wygenerowana elektronicznie i jest ważna bez podpisu.',
        this.margin,
        this.pageHeight - 40,
        { width: this.contentWidth, align: 'center' }
      );
  }

  // Helper methods
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatMoney(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  private formatNumber(num: number | string, decimals: number = 2): string {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return n.toFixed(decimals).replace(/\.?0+$/, '');
  }

  private numberToWords(num: number, currency: string): string {
    // Simplified Polish number to words conversion
    const ones = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
    const teens = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
    const tens = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
    const hundreds = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];

    const zloty = Math.floor(num);
    const grosze = Math.round((num - zloty) * 100);

    let result = '';

    if (zloty >= 1000) {
      const thousands = Math.floor(zloty / 1000);
      if (thousands === 1) {
        result += 'tysiąc ';
      } else if (thousands >= 2 && thousands <= 4) {
        result += ones[thousands] + ' tysiące ';
      } else {
        result += ones[thousands] + ' tysięcy ';
      }
    }

    const remainder = zloty % 1000;
    const h = Math.floor(remainder / 100);
    const t = Math.floor((remainder % 100) / 10);
    const o = remainder % 10;

    if (h > 0) result += hundreds[h] + ' ';
    if (t === 1) {
      result += teens[o] + ' ';
    } else {
      if (t > 1) result += tens[t] + ' ';
      if (o > 0) result += ones[o] + ' ';
    }

    // Currency
    const currencyNames: Record<string, string> = {
      PLN: 'zł',
      EUR: 'EUR',
      USD: 'USD',
    };
    result += (currencyNames[currency] || currency) + ' ';
    result += `${grosze.toString().padStart(2, '0')}/100`;

    return result.trim();
  }
}

export default new InvoicePdfService();
