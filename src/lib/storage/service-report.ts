import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import { createClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────

interface ReportData {
  ticketNo: string;
  tenantName: string;
  tenantLogo?: string | null;
  tenantPhone?: string;
  tenantEmail?: string;
  tenantAddress?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial: string;
  technicianName?: string;
  issueDesc: string;
  workDone?: string;
  customerNote?: string;
  tdsBefore?: number | null;
  tdsAfter?: number | null;
  pressureBefore?: number | null;
  pressureAfter?: number | null;
  leakCheck?: boolean | null;
  leakNotes?: string | null;
  resolution?: string | null;
  signatureDataUrl?: string | null;
  signatureName?: string | null;
  filterChanges?: Array<{
    filterName: string;
    stage: string;
    quantity: number;
  }>;
  completedAt?: string;
  reportConfig?: string | null;
}

interface ReportConfigParsed {
  primaryColor: string;
  accentColor: string;
  footerText: string;
  sections: {
    customer: boolean;
    device: boolean;
    measurements: boolean;
    filters: boolean;
    signature: boolean;
  };
}

function parseReportConfig(raw?: string | null): ReportConfigParsed {
  const defaults: ReportConfigParsed = {
    primaryColor: '#1e3a5f',
    accentColor: '#3498db',
    footerText: 'Bu rapor Water Purifier Service ERP sistemi tarafindan olusturulmustur.',
    sections: { customer: true, device: true, measurements: true, filters: true, signature: true },
  };
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    return {
      primaryColor: parsed.primaryColor ?? defaults.primaryColor,
      accentColor: parsed.accentColor ?? defaults.accentColor,
      footerText: parsed.footerText ?? defaults.footerText,
      sections: {
        customer: parsed.sections?.customer ?? true,
        device: parsed.sections?.device ?? true,
        measurements: parsed.sections?.measurements ?? true,
        filters: parsed.sections?.filters ?? true,
        signature: parsed.sections?.signature ?? true,
      },
    };
  } catch {
    return defaults;
  }
}

// ─── Turkish character conversion for PDFKit Helvetica ───

const TR_MAP: Record<string, string> = {
  'ı': 'i', 'İ': 'I', 'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G',
  'ü': 'u', 'Ü': 'U', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
};

function safeText(text: string): string {
  return text.replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => TR_MAP[c] ?? c);
}

function asValue(v: string | undefined | null): string {
  if (v == null || v === '') return '—';
  return safeText(String(v));
}

// ═══════════════════════════════════════════════
//  PDF Drawing Helpers
// ═══════════════════════════════════════════════

const M = 50; // page margin
const PAGE_W = 595.28 - M * 2; // A4 width minus margins
type Doc = typeof PDFDocument.prototype;

/** Lighten a hex color by mixing with white */
function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/** Draw a filled rectangle */
function rect(doc: Doc, x: number, y: number, w: number, h: number, color: string) {
  doc.save();
  doc.fillColor(color).rect(x, y, w, h).fill();
  doc.restore();
}

/** Draw a horizontal line */
function hline(doc: Doc, x: number, y: number, w: number, color = '#cccccc') {
  doc.save();
  doc.lineWidth(0.5).strokeColor(color).moveTo(x, y).lineTo(x + w, y).stroke();
  doc.restore();
}

/** Draw a table with label-value pairs.
 *  colW is the label column width; value column takes remaining space.
 *  Each row: [label, value].
 */
function drawKeyValueTable(
  doc: Doc,
  rows: Array<[string, string]>,
  startX: number,
  startY: number,
  colW: number,
  rowH: number,
  primaryColor: string,
) {
  const totalW = PAGE_W;
  const valW = totalW - colW;
  const lightBg = lighten(primaryColor, 0.92);
  let y = startY;

  // Table outer border
  doc.save();
  doc.lineWidth(0.5).strokeColor('#ccd5e0');
  doc.rect(startX, y, totalW, rows.length * rowH).stroke();
  doc.restore();

  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];

    // Alternating row background
    if (i % 2 === 0) {
      rect(doc, startX + 0.25, y + 0.25, totalW - 0.5, rowH - 0.5, lightBg);
    }

    // Label cell
    doc.save();
    rect(doc, startX, y, colW, rowH, primaryColor);
    doc.fillColor('#ffffff');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(safeText(label), startX + 6, y + rowH / 2 - 4, { width: colW - 12, align: 'left', lineBreak: false });
    doc.restore();

    // Value cell
    doc.fillColor('#1a1a2e');
    doc.fontSize(9).font('Helvetica');
    doc.text(value, startX + colW + 8, y + rowH / 2 - 5, { width: valW - 16, lineBreak: false });

    // Vertical divider between label and value
    hline(doc, startX + colW, y, 0); // vertical
    doc.save();
    doc.lineWidth(0.5).strokeColor('#ccd5e0');
    doc.moveTo(startX + colW, y).lineTo(startX + colW, y + rowH).stroke();
    doc.restore();

    // Horizontal row divider
    if (i < rows.length - 1) {
      hline(doc, startX, y + rowH, totalW, '#e0e5ec');
    }

    y += rowH;
  }

  return y + 10; // return next Y position with gap
}

/** Draw a multi-column data table.
 *  columns: array of { header, width }.
 *  rows: array of string arrays (one per cell).
 */
function drawDataTable(
  doc: Doc,
  columns: Array<{ header: string; width: number }>,
  rows: Array<string[]>,
  startX: number,
  startY: number,
  rowH: number,
  primaryColor: string,
) {
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  const lightBg = lighten(primaryColor, 0.92);
  let y = startY;

  // Outer border
  doc.save();
  doc.lineWidth(0.5).strokeColor('#ccd5e0');
  doc.rect(startX, y, totalW, (rows.length + 1) * rowH).stroke();
  doc.restore();

  // Header row
  rect(doc, startX, y, totalW, rowH, primaryColor);
  let cx = startX;
  for (const col of columns) {
    doc.fillColor('#ffffff');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(safeText(col.header), cx + 4, y + rowH / 2 - 4, { width: col.width - 8, align: 'center', lineBreak: false });
    cx += col.width;
  }
  y += rowH;

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (i % 2 === 0) {
      rect(doc, startX + 0.25, y + 0.25, totalW - 0.5, rowH - 0.5, lightBg);
    }

    cx = startX;
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j];
      const val = row[j] ?? '—';

      // Vertical divider
      if (j > 0) {
        doc.save();
        doc.lineWidth(0.5).strokeColor('#e0e5ec');
        doc.moveTo(cx, y).lineTo(cx, y + rowH).stroke();
        doc.restore();
      }

      doc.fillColor('#1a1a2e');
      doc.fontSize(8.5).font('Helvetica');
      doc.text(val, cx + 4, y + rowH / 2 - 5, { width: col.width - 8, align: 'center', lineBreak: false });

      cx += col.width;
    }

    if (i < rows.length - 1) {
      hline(doc, startX, y + rowH, totalW, '#e0e5ec');
    }

    y += rowH;
  }

  return y + 10;
}

/** Draw a section title with colored bar */
function drawSectionTitle(doc: Doc, title: string, y: number, color: string): number {
  const barH = 22;
  rect(doc, M, y, PAGE_W, barH, color);
  doc.fillColor('#ffffff');
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text(safeText(title), M + 8, y + barH / 2 - 5, { width: PAGE_W - 16, lineBreak: false });
  return y + barH;
}

// ═══════════════════════════════════════════════
//  Header
// ═══════════════════════════════════════════════

function drawHeader(doc: Doc, data: ReportData, logoBuffer?: ArrayBuffer, primaryColor?: string) {
  const color = primaryColor ?? '#1e3a5f';

  // Top accent bar
  rect(doc, M, M, PAGE_W, 4, color);

  // Logo — top right
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, M + PAGE_W - 85, M + 10, { width: 70, height: 35 });
    } catch (e) {
      console.error('Logo render error:', e);
    }
  }

  // Company name
  doc.fillColor(color);
  doc.fontSize(20).font('Helvetica-Bold');
  doc.text('SERVIS RAPORU', M, M + 14, { align: 'center', width: PAGE_W });

  doc.fillColor('#333333');
  doc.fontSize(11).font('Helvetica');
  doc.text(safeText(data.tenantName), M, M + 38, { align: 'center', width: PAGE_W });

  // Contact info line
  const contactParts: string[] = [];
  if (data.tenantPhone) contactParts.push(`Tel: ${safeText(data.tenantPhone)}`);
  if (data.tenantEmail) contactParts.push(`E-posta: ${safeText(data.tenantEmail)}`);
  if (contactParts.length > 0) {
    doc.fontSize(8).fillColor('#666666');
    doc.text(contactParts.join('  |  '), M, M + 52, { align: 'center', width: PAGE_W });
  }

  if (data.tenantAddress) {
    doc.fontSize(8).fillColor('#666666');
    doc.text(safeText(data.tenantAddress), M, M + 64, { align: 'center', width: PAGE_W });
  }

  // Ticket info bar
  const infoY = M + 80;
  rect(doc, M, infoY, PAGE_W, 20, '#f0f4f8');
  doc.fillColor('#333333');
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(`Fis No: ${data.ticketNo}`, M + 10, infoY + 5, { width: PAGE_W / 2 - 10, lineBreak: false });
  doc.font('Helvetica');
  if (data.completedAt) {
    doc.text(`Tarih: ${safeText(data.completedAt)}`, M + PAGE_W / 2, infoY + 5, { width: PAGE_W / 2 - 10, align: 'right', lineBreak: false });
  }

  return infoY + 35;
}

// ═══════════════════════════════════════════════
//  Main Report Generator
// ═══════════════════════════════════════════════

export async function generateServiceReport(
  data: ReportData,
): Promise<Buffer> {
  // Fetch logo
  let logoArrayBuffer: ArrayBuffer | undefined;
  if (data.tenantLogo) {
    try {
      const res = await fetch(data.tenantLogo);
      if (res.ok) {
        logoArrayBuffer = await res.arrayBuffer();
      }
    } catch (e) {
      console.error('Logo fetch error:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: M,
      info: {
        Title: `Servis Raporu - ${data.ticketNo}`,
        Author: data.tenantName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const cfg = parseReportConfig(data.reportConfig);
    const s = cfg.sections;
    let y = drawHeader(doc, data, logoArrayBuffer, cfg.primaryColor);

    // ── Customer Info ──────────────────────
    if (s.customer) {
      y = drawSectionTitle(doc, 'MUSTERI BILGILERI', y, cfg.primaryColor);
      y = drawKeyValueTable(doc, [
        ['Ad Soyad', asValue(data.customerName)],
        ['Telefon', asValue(data.customerPhone)],
        ['Adres', asValue(data.customerAddress)],
      ], M, y, 100, 22, cfg.primaryColor);
    }

    // ── Device Info ─────────────────────────
    if (s.device) {
      y = drawSectionTitle(doc, 'CIHAZ BILGILERI', y, cfg.primaryColor);
      y = drawKeyValueTable(doc, [
        ['Marka / Model', asValue(`${data.deviceBrand} ${data.deviceModel}`)],
        ['Seri No', asValue(data.deviceSerial)],
        ['Teknisyen', asValue(data.technicianName)],
      ], M, y, 100, 22, cfg.primaryColor);
    }

    // ── Issue & Work Details ─────────────────
    y = drawSectionTitle(doc, 'ISLEM DETAYLARI', y, cfg.primaryColor);
    y = drawKeyValueTable(doc, [
      ['Ariza', asValue(data.issueDesc)],
      ['Yapilan Islem', asValue(data.workDone)],
      ['Cozum', asValue(data.resolution)],
      ['Musteri Notu', asValue(data.customerNote)],
    ], M, y, 100, 22, cfg.primaryColor);

    // ── Measurements ────────────────────────
    if (s.measurements) {
      y = drawSectionTitle(doc, 'OLCUM DEGERLERI', y, cfg.primaryColor);

      const colW = (PAGE_W) / 4;
      y = drawDataTable(doc, [
        { header: 'TDS Oncesi', width: colW },
        { header: 'TDS Sonrasi', width: colW },
        { header: 'Basinc Oncesi', width: colW },
        { header: 'Basinc Sonrasi', width: colW },
      ], [
        [
          data.tdsBefore != null ? String(data.tdsBefore) : '—',
          data.tdsAfter != null ? String(data.tdsAfter) : '—',
          data.pressureBefore != null ? `${data.pressureBefore} bar` : '—',
          data.pressureAfter != null ? `${data.pressureAfter} bar` : '—',
        ],
      ], M, y, 24, cfg.primaryColor);

      // Kaçak row — full width
      if (data.leakCheck != null) {
        const leakText = data.leakCheck ? '⚠ Kacak Var' : '✓ Kacak Yok';
        const leakExtra = data.leakNotes ? ` — ${safeText(data.leakNotes)}` : '';
        rect(doc, M, y, PAGE_W, 22, lighten(cfg.primaryColor, 0.92));
        doc.fillColor('#1a1a2e');
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Kacak Kontrolu:', M + 8, y + 5, { continued: true, lineBreak: false });
        doc.font('Helvetica').text(` ${leakText}${leakExtra}`, { lineBreak: false });
        y += 30;
      }
    }

    // ── Filter Changes ──────────────────────
    if (s.filters && data.filterChanges && data.filterChanges.length > 0) {
      y = drawSectionTitle(doc, 'DEGISEN FILTRELER', y, cfg.primaryColor);

      const stageLabels: Record<string, string> = {
        SEDIMENT: 'Sediment',
        CARBON_BLOCK: 'Karbon Blok',
        GAC: 'Granul Aktif Karbon',
        MEMBRANE: 'Membran',
        POST_CARBON: 'Son Karbon',
        UV: 'UV',
        ALKALINE: 'Alkali',
        MINERAL: 'Mineral',
        OTHER: 'Diger',
      };

      const nameW = PAGE_W * 0.45;
      const stageW = PAGE_W * 0.30;
      const qtyW = PAGE_W * 0.25;

      const filterRows = data.filterChanges.map((f) => [
        safeText(f.filterName),
        safeText(stageLabels[f.stage] || f.stage),
        String(f.quantity),
      ]);

      y = drawDataTable(doc, [
        { header: 'Filtre', width: nameW },
        { header: 'Asama', width: stageW },
        { header: 'Adet', width: qtyW },
      ], filterRows, M, y, 22, cfg.primaryColor);
    }

    // ── Signature ───────────────────────────
    if (s.signature) {
      y = drawSectionTitle(doc, 'MUSTERI IMZASI', y, cfg.primaryColor);

      const sigBoxW = 220;
      const sigBoxH = 70;
      const sigX = M + PAGE_W - sigBoxW;

      // Signature box border
      doc.save();
      doc.lineWidth(0.8).strokeColor('#ccd5e0').dash(3, { space: 2 });
      doc.roundedRect(sigX, y, sigBoxW, sigBoxH, 4).stroke();
      doc.restore();

      if (data.signatureDataUrl) {
        try {
          let imageInput: string | ArrayBuffer = data.signatureDataUrl;
          if (data.signatureDataUrl.startsWith('data:image/')) {
            const base64Data = data.signatureDataUrl.split(',')[1];
            if (base64Data) {
              const buf = Buffer.from(base64Data, 'base64');
              imageInput = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            }
          }
          doc.image(imageInput, sigX + 5, y + 5, { width: sigBoxW - 10, height: sigBoxH - 10 });
        } catch (err) {
          console.error('Signature load error:', err);
          doc.fontSize(9).fillColor('#999999').font('Helvetica');
          doc.text('(Imza yuklenemedi)', sigX, y + sigBoxH / 2 - 5, { width: sigBoxW, align: 'center', lineBreak: false });
        }
      } else {
        doc.fontSize(9).fillColor('#999999').font('Helvetica');
        doc.text('(Imza alinmadi)', sigX, y + sigBoxH / 2 - 5, { width: sigBoxW, align: 'center', lineBreak: false });
      }

      // Signature name below
      if (data.signatureName) {
        doc.fillColor('#333333');
        doc.fontSize(9).font('Helvetica');
        doc.text(`Imzalayan: ${safeText(data.signatureName)}`, sigX, y + sigBoxH + 5, { width: sigBoxW, align: 'center', lineBreak: false });
      }

      y += sigBoxH + 25;
    }

    // ── Footer ──────────────────────────────
    const footerY = doc.page.height - M;
    hline(doc, M, footerY - 15, PAGE_W, cfg.primaryColor);
    doc.fontSize(7).font('Helvetica').fillColor('#888888');
    doc.text(safeText(cfg.footerText), M, footerY - 10, { width: PAGE_W, align: 'center', lineBreak: false });

    doc.end();
  });
}

// ─── Save report to Supabase Storage ──────────

export async function saveReportToStorage(
  tenantId: string,
  ticketNo: string,
  pdfBuffer: Buffer,
): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const fileName = `${ticketNo.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  const storagePath = `tenants/${tenantId}/reports/${fileName}`;

  const { error } = await supabase.storage
    .from('service-reports')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw new Error('PDF yuklenemedi: ' + error.message);

  const { data: pub } = supabase.storage.from('service-reports').getPublicUrl(storagePath);
  return { publicUrl: pub.publicUrl, storagePath };
}
