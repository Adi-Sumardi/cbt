// Copy of parseTextQuestions extracted from apps/web/src/app/dashboard/exams/[id]/import/page.tsx
// This function should ideally be extracted to a shared util

function parseTextQuestions(raw: string) {
  const questions: any[] = [];
  const blocks = raw.trim().split(/\n(?=\s*\d+[\.\)]\s)/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l: string) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    if (!/^\d+[\.\)]/.test(lines[0])) continue;
    const questionLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
    if (!questionLine) continue;

    const options: any[] = [];
    let jawaban = '';
    let poin = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
      if (optMatch) {
        options.push({
          label: optMatch[1].toUpperCase(),
          content: optMatch[2].trim(),
          isCorrect: false,
          order: options.length + 1,
        });
        continue;
      }
      const ansMatch = line.match(/^(?:Jawaban|Kunci\s*Jawaban?)\s*[:\-]\s*([A-Da-d])/i);
      if (ansMatch) { jawaban = ansMatch[1].toUpperCase(); continue; }
      const poinMatch = line.match(/^(?:Poin|Bobot|Nilai)\s*[:\-]\s*(\d+(?:\.\d+)?)/i);
      if (poinMatch) { poin = parseFloat(poinMatch[1]); continue; }
    }

    if (jawaban && options.length > 0) {
      options.forEach((o) => { o.isCorrect = o.label === jawaban; });
    }

    let type: string;
    if (options.length === 0) type = 'ESSAY';
    else if (options.length === 2 && options.some((o: any) => /^(benar|salah|true|false)$/i.test(o.content))) type = 'TRUE_FALSE';
    else type = 'MULTIPLE_CHOICE';

    questions.push({ content: questionLine, type, points: poin, options });
  }
  return questions;
}

describe('parseTextQuestions', () => {
  describe('single multiple choice question', () => {
    it('should parse a complete multiple choice question', () => {
      const input = `1. Berapakah nilai x jika 2x + 4 = 10?
A. 2
B. 3
C. 4
D. 5
Jawaban: B
Poin: 1`;

      const result = parseTextQuestions(input);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Berapakah nilai x jika 2x + 4 = 10?');
      expect(result[0].type).toBe('MULTIPLE_CHOICE');
      expect(result[0].points).toBe(1);
      expect(result[0].options).toHaveLength(4);
      const correctOpt = result[0].options.find((o: any) => o.isCorrect);
      expect(correctOpt?.label).toBe('B');
      expect(correctOpt?.content).toBe('3');
    });

    it('should support question numbers with parenthesis format', () => {
      const input = `1) Apa ibukota Indonesia?
A) Jakarta
B) Surabaya
Jawaban: A`;

      const result = parseTextQuestions(input);
      expect(result[0].content).toBe('Apa ibukota Indonesia?');
    });
  });

  describe('true/false question', () => {
    it('should parse a Benar/Salah question as TRUE_FALSE', () => {
      const input = `1. Bumi mengelilingi matahari.
A. Benar
B. Salah
Jawaban: A
Poin: 1`;

      const result = parseTextQuestions(input);
      expect(result[0].type).toBe('TRUE_FALSE');
      expect(result[0].options).toHaveLength(2);
    });

    it('should parse True/False in English as TRUE_FALSE', () => {
      const input = `1. The Earth revolves around the Sun.
A. True
B. False
Jawaban: A`;

      const result = parseTextQuestions(input);
      expect(result[0].type).toBe('TRUE_FALSE');
    });
  });

  describe('essay question', () => {
    it('should parse a question with no options as ESSAY', () => {
      const input = `1. Jelaskan pengertian fotosintesis!
Poin: 5`;

      const result = parseTextQuestions(input);
      expect(result[0].type).toBe('ESSAY');
      expect(result[0].options).toHaveLength(0);
      expect(result[0].points).toBe(5);
    });

    it('should use default points of 1 for essay with no Poin line', () => {
      const input = `1. Jelaskan apa itu demokrasi!`;

      const result = parseTextQuestions(input);
      expect(result[0].type).toBe('ESSAY');
      expect(result[0].points).toBe(1);
    });
  });

  describe('multiple questions', () => {
    it('should parse multiple questions separated by blank lines', () => {
      const input = `1. Soal pertama?
A. Opsi A
B. Opsi B
C. Opsi C
D. Opsi D
Jawaban: C
Poin: 2

2. Soal kedua?
A. Ya
B. Tidak
Jawaban: A

3. Soal essay!
Poin: 5`;

      const result = parseTextQuestions(input);
      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('Soal pertama?');
      expect(result[0].points).toBe(2);
      expect(result[1].content).toBe('Soal kedua?');
      expect(result[2].content).toBe('Soal essay!');
      expect(result[2].type).toBe('ESSAY');
    });
  });

  describe('Arabic and Chinese text support', () => {
    it('should parse questions with Arabic text', () => {
      const input = `1. ما هي عاصمة إندونيسيا؟
A. جاكرتا
B. سورابايا
C. بانيووانگي
D. بالي
Jawaban: A
Poin: 1`;

      const result = parseTextQuestions(input);
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('إندونيسيا');
      expect(result[0].options).toHaveLength(4);
    });

    it('should parse questions with Chinese text', () => {
      const input = `1. 印度尼西亚的首都是什么？
A. 雅加达
B. 泗水
Jawaban: A`;

      const result = parseTextQuestions(input);
      expect(result[0].content).toContain('印度尼西亚');
    });
  });

  describe('invalid format', () => {
    it('should return empty array if no valid question number found', () => {
      const input = `Ini adalah teks biasa tanpa nomor soal.
Jawaban: A`;

      const result = parseTextQuestions(input);
      expect(result).toHaveLength(0);
    });

    it('should skip blocks with empty question text', () => {
      const input = `1.
A. Opsi A
B. Opsi B
Jawaban: A`;

      const result = parseTextQuestions(input);
      expect(result).toHaveLength(0);
    });

    it('should handle empty string input', () => {
      const result = parseTextQuestions('');
      expect(result).toHaveLength(0);
    });
  });

  describe('custom points', () => {
    it('should parse custom point value', () => {
      const input = `1. Soal dengan bobot tinggi.
Poin: 10`;
      const result = parseTextQuestions(input);
      expect(result[0].points).toBe(10);
    });

    it('should parse decimal point values', () => {
      const input = `1. Soal dengan bobot desimal.
Poin: 2.5`;
      const result = parseTextQuestions(input);
      expect(result[0].points).toBe(2.5);
    });

    it('should support Bobot as alternative to Poin', () => {
      const input = `1. Soal dengan bobot.
Bobot: 3`;
      const result = parseTextQuestions(input);
      expect(result[0].points).toBe(3);
    });

    it('should support Nilai as alternative to Poin', () => {
      const input = `1. Soal dengan nilai.
Nilai: 4`;
      const result = parseTextQuestions(input);
      expect(result[0].points).toBe(4);
    });
  });
});
