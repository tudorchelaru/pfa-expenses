import type { APIRoute } from 'astro';
import { findSession } from '../../lib/sessions';
import { readRegistru } from '../../lib/registru';
import { mkdir, unlink } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';

export const POST: APIRoute = async ({ cookies }) => {
  // Verificare autentificare
  const sessionId = cookies.get('session')?.value;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Neautorizat' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = await findSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sesiune invalidă' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const username = session.username;

  try {
    // Citește toate înregistrările
    const entries = await readRegistru(username);

    if (entries.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Nu există înregistrări în registru. Adaugă cel puțin o înregistrare.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Grupează datele pe ani și luni
    const byYearMonth: Record<string, Record<number, typeof entries>> = {};
    
    for (const entry of entries) {
      const date = new Date(entry.data);
      if (isNaN(date.getTime())) continue;
      
      const year = date.getFullYear().toString();
      const month = date.getMonth() + 1;
      
      if (!byYearMonth[year]) {
        byYearMonth[year] = {};
      }
      if (!byYearMonth[year][month]) {
        byYearMonth[year][month] = [];
      }
      
      byYearMonth[year][month].push(entry);
    }

    // Creează directorul pentru PDF-uri dacă nu există
    const registreDir = join(process.cwd(), 'data', 'registre');
    if (!existsSync(registreDir)) {
      await mkdir(registreDir, { recursive: true });
    }

    // Numele lunilor în română
    const luniRomana: Record<number, string> = {
      1: 'Ianuarie',
      2: 'Februarie',
      3: 'Martie',
      4: 'Aprilie',
      5: 'Mai',
      6: 'Iunie',
      7: 'Iulie',
      8: 'August',
      9: 'Septembrie',
      10: 'Octombrie',
      11: 'Noiembrie',
      12: 'Decembrie'
    };

    const generatedFiles: string[] = [];
    const mmToPt = (value: number) => value * 2.834645669;
    const ptToMm = (value: number) => value / 2.834645669;
    const pageHeightLimit = mmToPt(190);

    // Generează PDF-uri pentru fiecare an
    for (const [year, months] of Object.entries(byYearMonth)) {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: {
          top: mmToPt(20),
          bottom: mmToPt(20),
          left: mmToPt(20),
          right: mmToPt(20)
        }
      });

      const setDocYmm = (mm: number) => {
        doc.y = mmToPt(mm);
      };
      const addDocY = (mm: number) => {
        doc.y += mmToPt(mm);
      };
      const getDocYmm = () => ptToMm(doc.y);
      setDocYmm(20);

      const filename = `${username}_registru_${year}.pdf`;
      const filepath = join(registreDir, filename);
      
      // Șterge PDF-ul vechi dacă există, pentru a-l regenera cu datele actualizate
      if (existsSync(filepath)) {
        try {
          await unlink(filepath);
        } catch (error) {
          console.error(`Eroare la ștergerea PDF-ului vechi ${filepath}:`, error);
          // Continuă chiar dacă ștergerea eșuează, createWriteStream va suprascrie fișierul
        }
      }
      
      const stream = createWriteStream(filepath);
      doc.pipe(stream);

      // Funcție helper pentru a desena o celulă similară cu FPDF's Cell()
      // width: lățimea celulei în mm
      // height: înălțimea celulei în mm
      // text: textul de afișat
      // border: dacă să deseneze bordură (1) sau nu (0)
      // align: 'L' (left), 'C' (center), 'R' (right)
      // ln: dacă să treacă la linia următoare (1) sau nu (0)
      const drawCell = (x: number, y: number, width: number, height: number, text: string, border: number = 1, align: 'L' | 'C' | 'R' = 'L', ln: number = 0): number => {
        const rectX = mmToPt(x);
        const rectY = mmToPt(y);
        const rectWidth = mmToPt(width);
        const rectHeight = mmToPt(height);

        if (border === 1) {
          doc.rect(rectX, rectY, rectWidth, rectHeight).stroke();
        }
        
        // Padding vertical: centrează textul în celulă pe baza liniei curente
        const currentLineHeight = doc.currentLineHeight(true);
        const textY = rectY + rectHeight / 2 - currentLineHeight / 2;
        
        // Padding orizontal: lasă 1mm de la margini
        const textX = rectX + mmToPt(1);
        const textWidth = rectWidth - mmToPt(2); // Lățime text = lățime celulă - 2mm padding

        doc.text(text, textX, textY, { 
          width: textWidth, 
          align: align === 'L' ? 'left' : align === 'C' ? 'center' : 'right',
          lineGap: 0,
          lineBreak: false
        });
        
        if (ln === 1) {
          doc.y = rectY + rectHeight;
        }
        
        return x + width; // Returnează noua poziție X
      };

      // Titlu - exact ca în PHP: Cell(0, 10, "Registru incasari si plati - $year", 0, 1, "C")
      doc.fontSize(14).font('Helvetica-Bold');
      const titleY = 20;
      doc.text(`Registru incasari si plati - ${year}`, {
        x: mmToPt(20),
        y: mmToPt(titleY),
        width: doc.page.width - mmToPt(40),
        align: 'center'
      });
      setDocYmm(titleY + 10 + 5); // Ln(5) după titlu

      let totalIncNumerar = 0;
      let totalIncBanca = 0;
      let totalPltNumerar = 0;
      let totalPltBanca = 0;
      let currentX = 20; // Variabilă pentru poziția X curentă (folosită în toată bucla și după)

      // Pentru fiecare lună
      for (let luna = 1; luna <= 12; luna++) {
        if (!months[luna] || months[luna].length === 0) continue;

        const lunaData = months[luna];
        const numeLuna = luniRomana[luna];

        // Verifică dacă mai avem spațiu pe pagină - exact ca în PHP: if ($pdf->GetY() + 40 > 190)
        // În landscape A4, înălțimea este ~210mm, deci 190mm este pragul
        if (doc.y + mmToPt(40) > pageHeightLimit) {
          doc.addPage();
          setDocYmm(20); // Reset la marginea de sus
        }

        // Header lună - exact ca în PHP: Cell(0, 8, strtoupper($nume_luna), 0, 1)
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(numeLuna.toUpperCase(), {
          x: mmToPt(20),
          y: doc.y,
          width: doc.page.width - mmToPt(40)
        });
        addDocY(8);

        // Header tabel - exact ca în PHP
        doc.fontSize(10).font('Helvetica-Bold');
        currentX = 20; // Reset la marginea stângă pentru fiecare lună
        const startY = getDocYmm();
        const rowHeight = 10;
        const subRowHeight = 5;
        
        // Rând principal header - exact ca în PHP
        // Cell(10, 10, "Nr", 1)
        currentX = drawCell(currentX, startY, 10, rowHeight, 'Nr', 1, 'C', 0);
        
        // Cell(25, 10, "Data", 1)
        currentX = drawCell(currentX, startY, 25, rowHeight, 'Data', 1, 'C', 0);
        
        // Cell(70, 10, "Document", 1)
        currentX = drawCell(currentX, startY, 70, rowHeight, 'Document', 1, 'C', 0);
        
        // Cell(60, 5, "Incasari", 1, 0, "C") - înălțime 5, nu trece la linia următoare
        currentX = drawCell(currentX, startY, 60, 5, 'Incasari', 1, 'C', 0);
        
        // Cell(60, 5, "Plati", 1, 1, "C") - înălțime 5, trece la linia următoare
        currentX = drawCell(currentX, startY, 60, 5, 'Plati', 1, 'C', 1);
        
        // Rând secundar header - exact ca în PHP
        // Cell(10, 5, "", 0) - fără bordură
        currentX = 20;
        const subHeaderY = startY + 5;
        currentX = drawCell(currentX, subHeaderY, 10, subRowHeight, '', 0, 'L', 0);
        currentX = drawCell(currentX, subHeaderY, 25, subRowHeight, '', 0, 'L', 0);
        currentX = drawCell(currentX, subHeaderY, 70, subRowHeight, '', 0, 'L', 0);
        
        // Cell(30, 5, "Numerar", 1, 0, "C")
        currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Numerar', 1, 'C', 0);
        
        // Cell(30, 5, "Banca", 1, 0, "C")
        currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Banca', 1, 'C', 0);
        
        // Cell(30, 5, "Numerar", 1, 0, "C")
        currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Numerar', 1, 'C', 0);
        
        // Cell(30, 5, "Banca", 1, 1, "C") - trece la linia următoare
        currentX = drawCell(currentX, subHeaderY, 30, subRowHeight, 'Banca', 1, 'C', 1);
        
        setDocYmm(subHeaderY + subRowHeight);

        // Sortare după dată
        lunaData.sort((a, b) => a.data.localeCompare(b.data));

        // Funcție helper pentru formatare ca number_format din PHP
        // PHP number_format($num, 2) returnează: virgulă pentru zecimale, punct pentru mii
        // Ex: 1234.56 -> "1.234,56"
        const formatNumber = (num: number): string => {
          return num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        };

        let incNumerar = 0;
        let incBanca = 0;
        let pltNumerar = 0;
        let pltBanca = 0;

        // Rânduri de date cu borduri - exact ca în PHP: Cell(10, 7, $i++, 1)
        doc.fontSize(10).font('Helvetica');
        const dataRowHeight = 8; // Mărit de la 7 la 8 pentru mai mult spațiu
        let entryIndex = 1;
        lunaData.forEach((entry) => {
          // Verifică dacă mai avem spațiu pentru un rând nou
          if (doc.y + mmToPt(dataRowHeight) > pageHeightLimit) {
            doc.addPage();
            setDocYmm(20);
            // Redesenează header-ul dacă am trecut pe o pagină nouă
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
          
          // Parsează data corect - exact ca în PHP: $date = $entry["date_obj"]->format("d.m.Y")
          const dataParts = entry.data.split('-');
          const dataFormatata = dataParts.length === 3 
            ? `${dataParts[2]}.${dataParts[1]}.${dataParts[0]}`
            : entry.data;
          
          const suma = parseFloat(entry.suma.toString());
          const valuta = entry.valuta?.toUpperCase() || 'RON';
          const sumaRon = valuta === 'USD' ? suma : suma; // TODO: Adaugă conversie USD

          // Exact ca în PHP: Cell(10, 7, $i++, 1)
          currentX = 20;
          currentX = drawCell(currentX, rowY, 10, dataRowHeight, String(entryIndex++), 1, 'C', 0);
          
          // Cell(25, 7, $date, 1)
          currentX = drawCell(currentX, rowY, 25, dataRowHeight, dataFormatata, 1, 'L', 0);
          
          // Cell(70, 7, $document, 1)
          currentX = drawCell(currentX, rowY, 70, dataRowHeight, entry.document || 'Document', 1, 'L', 0);

          // Calculează încasări și plăți - exact ca în PHP cu number_format
          const cell: string[] = ['', '', '', ''];
          if (entry.tip === 'incasare' && entry.metoda === 'numerar') {
            cell[0] = formatNumber(sumaRon);
            incNumerar += sumaRon;
          }
          if (entry.tip === 'incasare' && entry.metoda === 'banca') {
            cell[1] = formatNumber(sumaRon);
            incBanca += sumaRon;
          }
          if (entry.tip === 'plata' && entry.metoda === 'numerar') {
            cell[2] = formatNumber(sumaRon);
            pltNumerar += sumaRon;
          }
          if (entry.tip === 'plata' && entry.metoda === 'banca') {
            cell[3] = formatNumber(sumaRon);
            pltBanca += sumaRon;
          }

          // Exact ca în PHP: foreach ($cell as $val) { $pdf->Cell(30, 7, $val, 1, 0, "R"); }
          for (let i = 0; i < 4; i++) {
            currentX = drawCell(currentX, rowY, 30, dataRowHeight, cell[i], 1, 'R', 0);
          }

          // $pdf->Ln() - trece la linia următoare
          setDocYmm(rowY + dataRowHeight);
        });

        // Total lună - exact ca în PHP
        doc.fontSize(10).font('Helvetica-Bold');
        const totalLunaY = getDocYmm();
        const totalRowHeight = 8; // Mărit de la 7 la 8
        currentX = 20;
        
        // Cell(105, 7, "TOTAL " . strtoupper($nume_luna), 1)
        currentX = drawCell(currentX, totalLunaY, 105, totalRowHeight, `TOTAL ${numeLuna.toUpperCase()}`, 1, 'L', 0);
        
        // Cell(30, 7, number_format($inc_numerar, 2), 1, 0, "R")
        currentX = drawCell(currentX, totalLunaY, 30, totalRowHeight, formatNumber(incNumerar), 1, 'R', 0);
        currentX = drawCell(currentX, totalLunaY, 30, totalRowHeight, formatNumber(incBanca), 1, 'R', 0);
        currentX = drawCell(currentX, totalLunaY, 30, totalRowHeight, formatNumber(pltNumerar), 1, 'R', 0);
        currentX = drawCell(currentX, totalLunaY, 30, totalRowHeight, formatNumber(pltBanca), 1, 'R', 1);
        
        // $pdf->Ln(5) - trece la linia următoare cu 5mm spațiu
        setDocYmm(totalLunaY + totalRowHeight + 5);

        totalIncNumerar += incNumerar;
        totalIncBanca += incBanca;
        totalPltNumerar += pltNumerar;
        totalPltBanca += pltBanca;
      }

      // Total general anual - exact ca în PHP
      // Cell(0, 8, "TOTAL GENERAL ANUAL", 0, 1)
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL GENERAL ANUAL', {
        x: mmToPt(20),
        y: doc.y,
        width: doc.page.width - mmToPt(40),
        align: 'center'
      });
      addDocY(8);
      
      // Funcție helper pentru formatare ca number_format din PHP
      // PHP number_format($num, 2) returnează: virgulă pentru zecimale, punct pentru mii
      const formatNumber = (num: number): string => {
        return num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };

      // Cell(105, 7, "TOTAL:", 1)
      doc.fontSize(10).font('Helvetica-Bold');
      const totalGenY = getDocYmm();
      const totalGenHeight = 8; // Mărit de la 7 la 8
      currentX = 20;
      
      currentX = drawCell(currentX, totalGenY, 105, totalGenHeight, 'TOTAL:', 1, 'L', 0);
      currentX = drawCell(currentX, totalGenY, 30, totalGenHeight, formatNumber(totalIncNumerar), 1, 'R', 0);
      currentX = drawCell(currentX, totalGenY, 30, totalGenHeight, formatNumber(totalIncBanca), 1, 'R', 0);
      currentX = drawCell(currentX, totalGenY, 30, totalGenHeight, formatNumber(totalPltNumerar), 1, 'R', 0);
      currentX = drawCell(currentX, totalGenY, 30, totalGenHeight, formatNumber(totalPltBanca), 1, 'R', 1);
      
      // $pdf->Ln(5)
      setDocYmm(totalGenY + totalGenHeight + 5);

      // Totaluri simple - exact ca în PHP
      const totalIncasari = totalIncNumerar + totalIncBanca;
      const totalCheltuieli = totalPltNumerar + totalPltBanca;
      const diff = totalIncasari - totalCheltuieli;

      doc.fontSize(10).font('Helvetica-Bold');
      const totalSimpleY = getDocYmm();
      const totalSimpleHeight = 8; // Mărit de la 7 la 8
      currentX = 20;
      
      // Cell(105, 7, "TOTAL INCASARI / PLATI:", 1)
      currentX = drawCell(currentX, totalSimpleY, 105, totalSimpleHeight, 'TOTAL INCASARI / PLATI:', 1, 'L', 0);
      
      // Cell(60, 7, number_format($total_incasari, 2), 1, 0, "R")
      currentX = drawCell(currentX, totalSimpleY, 60, totalSimpleHeight, formatNumber(totalIncasari), 1, 'R', 0);
      
      // Cell(60, 7, number_format($total_cheltuieli, 2), 1, 1, "R") - trece la linia următoare (1)
      currentX = drawCell(currentX, totalSimpleY, 60, totalSimpleHeight, formatNumber(totalCheltuieli), 1, 'R', 1);

      // Cell(105, 7, $diff >= 0 ? "PROFIT:" : "PIERDERE:", 1)
      const profitY = totalSimpleY + totalSimpleHeight;
      currentX = 20;
      currentX = drawCell(currentX, profitY, 105, totalSimpleHeight, diff >= 0 ? 'PROFIT:' : 'PIERDERE:', 1, 'L', 0);
      
      // Cell(120, 7, number_format(abs($diff), 2), 1, 1, "R") - trece la linia următoare (1)
      currentX = drawCell(currentX, profitY, 120, totalSimpleHeight, formatNumber(Math.abs(diff)), 1, 'R', 1);

      // Finalizează PDF-ul
      doc.end();

      // Așteaptă finalizarea scrierii
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', () => {
          generatedFiles.push(filename);
          resolve();
        });
        stream.on('error', reject);
      });
    }

    const years = Object.keys(byYearMonth);
    
    return new Response(JSON.stringify({ 
      message: `PDF-urile au fost generate cu succes pentru ${years.length} an(i): ${years.join(', ')}`,
      years: years,
      files: generatedFiles,
      entryCount: entries.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Eroare la generarea PDF-urilor:', error);
    return new Response(JSON.stringify({ 
      error: 'Eroare la generarea PDF-urilor: ' + (error instanceof Error ? error.message : 'Eroare necunoscută')
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
