import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ImportService {
  parseExcel(buffer: Buffer) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('File Excel tidak valid');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const questions = rows
      .filter((row) => row['Soal'] || row['soal'] || row['SOAL'])
      .map((row, i) => {
        const content = (row['Soal'] || row['soal'] || row['SOAL'] || '').toString().trim();
        const jawabanRaw = (row['Jawaban'] || row['jawaban'] || row['JAWABAN'] || '').toString().trim();
        const poin = parseFloat(row['Poin'] || row['poin'] || row['Bobot'] || '1') || 1;

        const optKeys = [
          { key: 'Opsi A', label: 'A' },
          { key: 'Opsi B', label: 'B' },
          { key: 'Opsi C', label: 'C' },
          { key: 'Opsi D', label: 'D' },
        ];

        // Parse multiple correct labels by separating by comma, semicolon or space
        const correctLabels = jawabanRaw.toUpperCase().split(/[,\s;]+/).filter(Boolean);

        const options = optKeys
          .map(({ key, label }) => ({ label, content: (row[key] || row[key.toLowerCase()] || '').toString().trim() }))
          .filter((o) => o.content !== '')
          .map((o, idx) => ({
            label: o.label,
            content: o.content,
            isCorrect: correctLabels.includes(o.label),
            order: idx + 1
          }));

        let type = 'MULTIPLE_CHOICE';
        if (options.length === 0) {
          if (jawabanRaw.trim() !== '') {
            type = 'SHORT_ANSWER';
            options.push({
              label: '1',
              content: jawabanRaw.trim(),
              isCorrect: true,
              order: 1
            });
          } else {
            type = 'ESSAY';
          }
        } else if (correctLabels.length > 1) {
          type = 'MULTIPLE_ANSWER';
        } else if (options.length === 2 && options.some((o) => /^(benar|salah|true|false)$/i.test(o.content))) {
          type = 'TRUE_FALSE';
        }

        return { content, type, points: poin, options };
      })
      .filter((q) => q.content);

    if (questions.length === 0) {
      throw new BadRequestException('Tidak ada soal ditemukan. Pastikan kolom "Soal" ada di baris pertama.');
    }

    return questions;
  }

  generateTemplate(): Buffer {
    const data = [
      { 'Soal': 'Berapakah nilai x jika 2x + 4 = 10?', 'Opsi A': '2', 'Opsi B': '3', 'Opsi C': '4', 'Opsi D': '5', 'Jawaban': 'B', 'Poin': 1 },
      { 'Soal': 'Ibukota Indonesia adalah Jakarta.', 'Opsi A': 'Benar', 'Opsi B': 'Salah', 'Opsi C': '', 'Opsi D': '', 'Jawaban': 'A', 'Poin': 1 },
      { 'Soal': 'Sebutkan hewan mamalia darat terbesar yang masih hidup!', 'Opsi A': '', 'Opsi B': '', 'Opsi C': '', 'Opsi D': '', 'Jawaban': 'Gajah', 'Poin': 2 },
      { 'Soal': 'Manakah dari berikut ini yang merupakan bahasa pemrograman? (Pilih semua yang benar)', 'Opsi A': 'JavaScript', 'Opsi B': 'HTML', 'Opsi C': 'Rust', 'Opsi D': 'CSS', 'Jawaban': 'A,C', 'Poin': 2 },
      { 'Soal': 'Jelaskan cara kerja protokol HTTP!', 'Opsi A': '', 'Opsi B': '', 'Opsi C': '', 'Opsi D': '', 'Jawaban': '', 'Poin': 5 },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Soal');

    // Set column widths
    ws['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 6 }];

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
