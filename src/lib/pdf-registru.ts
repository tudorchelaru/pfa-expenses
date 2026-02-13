/**
 * Generare PDF registru - funcție reutilizabilă pentru buffer sau disk.
 * Pe Vercel, PDF-urile se generează la cerere în memorie (filesystem read-only).
 */

import type { RegistruEntry } from './registru';
import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

export type ByYearMonth = Record<string, Record<number, RegistruEntry[]>>;

const LUNI_ROMANA: Record<number, string> = {
  1: 'Ianuarie', 2: 'Februarie', 3: 'Martie', 4: 'Aprilie', 5: 'Mai', 6: 'Iunie',
  7: 'Iulie', 8: 'August', 9: 'Septembrie', 10: 'Octombrie', 11: 'Noiembrie', 12: 'Decembrie'
};

const mmToPt = (value: number) => value * 2.834645669;
const ptToMm = (value: number) => value / 2.834645669;
const formatNumber = (num: number): string =>
  num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Generează PDF pentru un an și returnează buffer-ul.
 */
export async function generateRegistruPDFBuffer(
  username: string,
  year: string,
  months: Record<number, RegistruEntry[]>
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: mmToPt(20), bottom: mmToPt(20), left: mmToPt(20), right: mmToPt(20) }
  });

  const chunks: Buffer[] = [];
  const writable = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk);
      cb();
    }
  });
  doc.pipe(writable);

  const setDocYmm = (mm: number) => { doc.y = mmToPt(mm); };
  const addDocY = (mm: number) => { doc.y += mmToPt(mm); };
  const getDocYmm = () => ptToMm(doc.y);
  const pageHeightLimit = mmToPt(190);
  setDocYmm(20);

  const drawCell = (x: number, y: number, width: number, height: number, text: string, border: number = 1, align: 'L' | 'C' | 'R' = 'L', ln: number = 0): number => {
    const rectX = mmToPt(x), rectY = mmToPt(y), rectWidth = mmToPt(width), rectHeight = mmToPt(height);
    if (border === 1) doc.rect(rectX, rectY, rectWidth, rectHeight).stroke();
    const currentLineHeight = doc.currentLineHeight(true);
    const textY = rectY + rectHeight / 2 - currentLineHeight / 2;
    const textX = rectX + mmToPt(1);
    const textWidth = rectWidth - mmToPt(2);
    doc.text(text, textX, textY, {
      width: textWidth,
      align: align === 'L' ? 'left' : align === 'C' ? 'center' : 'right',
      lineGap: 0,
      lineBreak: false
    });
    if (ln === 1) doc.y = rectY + rectHeight;
    return x + width;
  };

  let totalIncNumerar = 0, totalIncBanca = 0, totalPltNumerar = 0, totalPltBanca = 0;
  let currentX = 20;
  const rowHeight = 10, subRowHeight = 5, dataRowHeight = 8;

  doc.fontSize(14).font('Helvetica-Bold');
  doc.text(`Registru incasari si plati - ${year}`, { x: mmToPt(20), y: mmToPt(20), width: doc.page.width - mmToPt(40), align: 'center' });
  setDocYmm(35);

  for (let luna = 1; luna <= 12; luna++) {
    if (!months[luna] || months[luna].length === 0) continue;
    const lunaData = [...months[luna]].sort((a, b) => a.data.localeCompare(b.data));
    const numeLuna = LUNI_ROMANA[luna];

    if (doc.y + mmToPt(40) > pageHeightLimit) {
      doc.addPage();
      setDocYmm(20);
    }

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(numeLuna.toUpperCase(), { x: mmToPt(20), y: doc.y, width: doc.page.width - mmToPt(40) });
    addDocY(8);

    doc.fontSize(10).font('Helvetica-Bold');
    currentX = 20;
    const startY = getDocYmm();
    currentX = drawCell(currentX, startY, 10, rowHeight, 'Nr', 1, 'C', 0);
    currentX = drawCell(currentX, startY, 25, rowHeight, 'Data', 1, 'C', 0);
    currentX = drawCell(currentX, startY, 70, rowHeight, 'Document', 1, 'C', 0);
    currentX = drawCell(currentX, startY, 60, 5, 'Incasari', 1, 'C', 0);
    currentX = drawCell(currentX, startY, 60, 5, 'Plati', 1, 'C', 1);
    const subHeaderY = startY + 5;
    currentX = 20;
    currentX = drawCell(currentX, subHeaderY, 10, subRowHeight, '', 0, 'L', 0);
    currentX = drawCell(currentX, subHeaderY, 25, subRowHeight, '', 0, 'L', 0);
    currentX = drawCell(currentX, subHeaderY, 70, subRowHeight, '', 0, 'L', 0);
    currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Numerar', 1, 'C', 0);
    currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Banca', 1, 'C', 0);
    currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Numerar', 1, 'C', 0);
    currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Banca', 1, 'C', 1);
    setDocYmm(subHeaderY + subRowHeight);

    let incNumerar = 0, incBanca = 0, pltNumerar = 0, pltBanca = 0;
    doc.fontSize(10).font('Helvetica');
    let entryIndex = 1;

    for (const entry of lunaData) {
      if (doc.y + mmToPt(dataRowHeight) > pageHeightLimit) {
        doc.addPage();
        setDocYmm(20);
        const newStartY = getDocYmm();
        doc.fontSize(10).font('Helvetica-Bold');
        currentX = 20;
        currentX = drawCell(currentX, newStartY, 10, rowHeight, 'Nr', 1, 'C', 0);
        currentX = drawCell(currentX, newStartY, 25, rowHeight, 'Data', 1, 'C', 0);
        currentX = drawCell(currentX, newStartY, 70, rowHeight, 'Document', 1, 'C', 0);
        currentX = drawCell(currentX, newStartY, 60, 5, 'Incasari', 1, 'C', 0);
        currentX = drawCell(currentX, newStartY, 60, 5, 'Plati', 1, 'C', 1);
        const newSubHeaderY = newStartY + 5;
        currentX = 20;
        currentX = drawCell(currentX, newSubHeaderY, 10, subRowHeight, '', 0, 'L', 0);
        currentX = drawCell(currentX, newSubHeaderY, 25, subRowHeight, '', 0, 'L', 0);
        currentX = drawCell(currentX, newSubHeaderY, 70, subRowHeight, '', 0, 'L', 0);
        currentX = drawCell(currentX, newSubHeaderY, 30, subRowHeight, 'Numerar', 1, 'C', 0);
        currentX = drawCell(currentX, newSubHeaderY, 30, subRowHeight, 'Banca', 1, 'C', 0);
        currentX = drawCell(currentX, newSubHeaderY, 30, subRowHeight, 'Numerar', 1, 'C', 0);
        currentX = drawCell(currentX, newSubHeaderY, 30, subRowHeight, 'Banca', 1, 'C', 1);
        setDocYmm(newSubHeaderY + subRowHeight);
        doc.fontSize(10).font('Helvetica');
      }

      const rowY = getDocYmm();
      const dataParts = entry.data.split('-');
      const dataFormatata = dataParts.length === 3 ? `${dataParts[2]}.${dataParts[1]}.${dataParts[0]}` : entry.data;
      const suma = parseFloat(entry.suma.toString());
      const valuta = entry.valuta?.toUpperCase() || 'RON';
      const sumaRon = valuta === 'USD' ? suma : suma;

      const cell: string[] = ['', '', '', ''];
      if (entry.tip === 'incasare' && entry.metoda === 'numerar') { cell[0] = formatNumber(sumaRon); incNumerar += sumaRon; }
      if (entry.tip === 'incasare' && entry.metoda === 'banca') { cell[1] = formatNumber(sumaRon); incBanca += sumaRon; }
      if (entry.tip === 'plata' && entry.metoda === 'numerar') { cell[2] = formatNumber(sumaRon); pltNumerar += sumaRon; }
      if (entry.tip === 'plata' && entry.metoda === 'banca') { cell[3] = formatNumber(sumaRon); pltBanca += sumaRon; }

      currentX = 20;
      currentX = drawCell(currentX, rowY, 10, dataRowHeight, String(entryIndex++), 1, 'C', 0);
      currentX = drawCell(currentX, rowY, 25, dataRowHeight, dataFormatata, 1, 'L', 0);
      currentX = drawCell(currentX, rowY, 70, dataRowHeight, entry.document || 'Document', 1, 'L', 0);
      for (let i = 0; i < 4; i++) currentX = drawCell(currentX, rowY, 30, dataRowHeight, cell[i], 1, 'R', 0);
      setDocYmm(rowY + dataRowHeight);
    }

    doc.fontSize(10).font('Helvetica-Bold');
    const totalLunaY = getDocYmm();
    currentX = 20;
    currentX = drawCell(currentX, totalLunaY, 105, dataRowHeight, `TOTAL ${numeLuna.toUpperCase()}`, 1, 'L', 0);
    currentX = drawCell(currentX, totalLunaY, 30, dataRowHeight, formatNumber(incNumerar), 1, 'R', 0);
    currentX = drawCell(currentX, totalLunaY, 30, dataRowHeight, formatNumber(incBanca), 1, 'R', 0);
    currentX = drawCell(currentX, totalLunaY, 30, dataRowHeight, formatNumber(pltNumerar), 1, 'R', 0);
    currentX = drawCell(currentX, totalLunaY, 30, dataRowHeight, formatNumber(pltBanca), 1, 'R', 1);
    setDocYmm(totalLunaY + dataRowHeight + 5);

    totalIncNumerar += incNumerar;
    totalIncBanca += incBanca;
    totalPltNumerar += pltNumerar;
    totalPltBanca += pltBanca;
  }

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('TOTAL GENERAL ANUAL', { x: mmToPt(20), y: doc.y, width: doc.page.width - mmToPt(40), align: 'center' });
  addDocY(8);

  doc.fontSize(10).font('Helvetica-Bold');
  const totalGenY = getDocYmm();
  currentX = 20;
  currentX = drawCell(currentX, totalGenY, 105, dataRowHeight, 'TOTAL:', 1, 'L', 0);
  currentX = drawCell(currentX, totalGenY, 30, dataRowHeight, formatNumber(totalIncNumerar), 1, 'R', 0);
  currentX = drawCell(currentX, totalGenY, 30, dataRowHeight, formatNumber(totalIncBanca), 1, 'R', 0);
  currentX = drawCell(currentX, totalGenY, 30, dataRowHeight, formatNumber(totalPltNumerar), 1, 'R', 0);
  currentX = drawCell(currentX, totalGenY, 30, dataRowHeight, formatNumber(totalPltBanca), 1, 'R', 1);
  setDocYmm(totalGenY + dataRowHeight + 5);

  const totalIncasari = totalIncNumerar + totalIncBanca;
  const totalCheltuieli = totalPltNumerar + totalPltBanca;
  const diff = totalIncasari - totalCheltuieli;

  const totalSimpleY = getDocYmm();
  currentX = 20;
  currentX = drawCell(currentX, totalSimpleY, 105, dataRowHeight, 'TOTAL INCASARI / PLATI:', 1, 'L', 0);
  currentX = drawCell(currentX, totalSimpleY, 60, dataRowHeight, formatNumber(totalIncasari), 1, 'R', 0);
  currentX = drawCell(currentX, totalSimpleY, 60, dataRowHeight, formatNumber(totalCheltuieli), 1, 'R', 1);

  const profitY = totalSimpleY + dataRowHeight;
  currentX = 20;
  currentX = drawCell(currentX, profitY, 105, dataRowHeight, diff >= 0 ? 'PROFIT:' : 'PIERDERE:', 1, 'L', 0);
  currentX = drawCell(currentX, profitY, 120, dataRowHeight, formatNumber(Math.abs(diff)), 1, 'R', 1);

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    writable.on('finish', () => resolve(Buffer.concat(chunks)));
    writable.on('error', reject);
  });
}
