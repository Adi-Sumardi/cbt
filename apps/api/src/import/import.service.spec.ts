import { Test, TestingModule } from '@nestjs/testing';
import { ImportService } from './import.service';
import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportService],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  function makeExcelBuffer(data: any[]): Buffer {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  describe('parseExcel', () => {
    it('should parse valid Excel with multiple choice questions', () => {
      const data = [
        { 'Soal': 'Berapakah 2+2?', 'Opsi A': '3', 'Opsi B': '4', 'Opsi C': '5', 'Opsi D': '6', 'Jawaban': 'B', 'Poin': 1 },
      ];
      const buffer = makeExcelBuffer(data);

      const result = service.parseExcel(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Berapakah 2+2?');
      expect(result[0].type).toBe('MULTIPLE_CHOICE');
      const correctOpt = result[0].options.find((o: any) => o.isCorrect);
      expect(correctOpt?.label).toBe('B');
    });

    it('should parse TRUE_FALSE question', () => {
      const data = [
        { 'Soal': 'Bumi berbentuk bulat.', 'Opsi A': 'Benar', 'Opsi B': 'Salah', 'Opsi C': '', 'Opsi D': '', 'Jawaban': 'A', 'Poin': 1 },
      ];
      const buffer = makeExcelBuffer(data);

      const result = service.parseExcel(buffer);

      expect(result[0].type).toBe('TRUE_FALSE');
    });

    it('should parse ESSAY question (no options)', () => {
      const data = [
        { 'Soal': 'Jelaskan fotosintesis!', 'Opsi A': '', 'Opsi B': '', 'Opsi C': '', 'Opsi D': '', 'Jawaban': '', 'Poin': 5 },
      ];
      const buffer = makeExcelBuffer(data);

      const result = service.parseExcel(buffer);

      expect(result[0].type).toBe('ESSAY');
      expect(result[0].options).toHaveLength(0);
      expect(result[0].points).toBe(5);
    });

    it('should throw BadRequestException for invalid/corrupt file', () => {
      const invalidBuffer = Buffer.from('not an excel file at all!!!!');

      expect(() => service.parseExcel(invalidBuffer)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no questions found', () => {
      const data = [{ 'Name': 'Test', 'Value': 123 }]; // no "Soal" column
      const buffer = makeExcelBuffer(data);

      expect(() => service.parseExcel(buffer)).toThrow(BadRequestException);
    });

    it('should use default points of 1 if Poin column missing', () => {
      const data = [
        { 'Soal': 'Test question', 'Opsi A': 'A1', 'Opsi B': 'B1', 'Jawaban': 'A' },
      ];
      const buffer = makeExcelBuffer(data);

      const result = service.parseExcel(buffer);

      expect(result[0].points).toBe(1);
    });
  });

  describe('generateTemplate', () => {
    it('should return a valid Excel buffer', () => {
      const buffer = service.generateTemplate();

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should contain at least 3 example rows (MC, T/F, Essay)', () => {
      const buffer = service.generateTemplate();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      expect(rows.length).toBeGreaterThanOrEqual(3);
    });
  });
});
