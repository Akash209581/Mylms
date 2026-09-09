import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedMcqRow {
  rowNumber: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D'
  marks: number;
  negativeMarks: number;
  difficulty: string;
  topic: string;
  explanation: string;
}

export interface ImportValidationResult {
  valid: ParsedMcqRow[];
  invalid: { rowNumber: number; reason: string; data: any }[];
  summary: { total: number; valid: number; invalid: number };
}

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);
const VALID_DIFFICULTIES = new Set(['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD']);

@Injectable()
export class ExamExcelService {
  /**
   * Parse an uploaded .xlsx / .xls buffer and validate each row.
   * Returns valid + invalid rows with reasons.
   */
  validate(fileBuffer: Buffer, originalName: string): ImportValidationResult {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Invalid Excel file. Please upload a valid .xlsx or .xls file.');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!raw.length) throw new BadRequestException('The Excel file has no data rows.');

    const valid: ParsedMcqRow[] = [];
    const invalid: { rowNumber: number; reason: string; data: any }[] = [];

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      const rowNumber = i + 2; // Excel row (1-indexed header)

      // Normalize keys (case-insensitive, trim)
      const normalized: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        normalized[key.toLowerCase().trim()] = String(row[key] ?? '').trim();
      }

      const question = normalized['question'] || normalized['question text'] || '';
      const optionA = normalized['option a'] || normalized['optiona'] || normalized['a'] || '';
      const optionB = normalized['option b'] || normalized['optionb'] || normalized['b'] || '';
      const optionC = normalized['option c'] || normalized['optionc'] || normalized['c'] || '';
      const optionD = normalized['option d'] || normalized['optiond'] || normalized['d'] || '';
      const correctAnswer = (normalized['correct answer'] || normalized['answer'] || normalized['correct'] || '').toUpperCase();
      const marksRaw = normalized['marks'] || '1';
      const negativeMarksRaw = normalized['negative marks'] || normalized['negative_marks'] || '0';
      const difficulty = (normalized['difficulty'] || 'MEDIUM').toUpperCase().replace(' ', '_');
      const topic = normalized['topic'] || normalized['topics'] || 'General';
      const explanation = normalized['explanation'] || '';

      // Validation
      if (!question) { invalid.push({ rowNumber, reason: 'Question text is required', data: row }); continue; }
      if (!optionA || !optionB || !optionC || !optionD) { invalid.push({ rowNumber, reason: 'All 4 options (A, B, C, D) are required', data: row }); continue; }
      if (!VALID_OPTIONS.has(correctAnswer)) { invalid.push({ rowNumber, reason: `Correct Answer must be A, B, C, or D (got "${correctAnswer}")`, data: row }); continue; }

      const marks = parseFloat(marksRaw);
      if (isNaN(marks) || marks <= 0) { invalid.push({ rowNumber, reason: `Invalid marks value: "${marksRaw}"`, data: row }); continue; }

      const negativeMarks = parseFloat(negativeMarksRaw);
      if (isNaN(negativeMarks) || negativeMarks < 0) { invalid.push({ rowNumber, reason: `Invalid negative marks: "${negativeMarksRaw}"`, data: row }); continue; }

      const resolvedDifficulty = VALID_DIFFICULTIES.has(difficulty) ? difficulty : 'MEDIUM';

      valid.push({ rowNumber, question, optionA, optionB, optionC, optionD, correctAnswer, marks, negativeMarks, difficulty: resolvedDifficulty, topic, explanation });
    }

    return {
      valid,
      invalid,
      summary: { total: raw.length, valid: valid.length, invalid: invalid.length },
    };
  }

  /** Generate and return an Excel template buffer */
  generateTemplate(): Buffer {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Marks', 'Negative Marks', 'Difficulty', 'Topic', 'Explanation'],
      ['What is 2 + 2?', '3', '4', '5', '6', 'B', '1', '0.25', 'EASY', 'Mathematics', '2+2=4'],
      ['Which language is used for web?', 'Python', 'JavaScript', 'Java', 'C++', 'B', '2', '0.5', 'MEDIUM', 'Web Development', 'JavaScript runs in browsers'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MCQ Import');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
