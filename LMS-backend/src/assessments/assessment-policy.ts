import { BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';

export type SnapshotQuestion = { id: number; type: string; text: string; options: string[]; marks: number; correct: string | null };
export type AssessmentSnapshot = { version: 1; title: string; passPercentage: number; questions: SnapshotQuestion[] };
export function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new BadRequestException('Assessment settings are outside supported limits');
  return number;
}
export function snapshotQuestion(question: any, marks: number, shuffleOptions: boolean): SnapshotQuestion {
  const options = Array.isArray(question.options) ? question.options.map(String) : [];
  let correct: string | null = null;
  if (question.type === 'MCQ') {
    if (!options.length || !options.includes(question.correctAnswer)) throw new BadRequestException(`Question ${question.id} has an invalid answer key`);
    correct = question.correctAnswer;
  } else if (question.type === 'OP' && typeof question.expectedOutput === 'string') correct = question.expectedOutput;
  // Free-text, ordering, matching and programming responses require instructor review.
  const details: string[] = [question.questionText || question.problemStatement || ''];
  if (question.codeSnippet) details.push(question.codeSnippet);
  if (question.type === 'PQ') details.push(...[question.problemStatement,question.inputFormat,question.outputFormat,question.constraints].filter(Boolean));
  if (question.type === 'JC' && Array.isArray(question.jumbledStatements)) details.push('Put these statements in order:\n' + shuffled(question.jumbledStatements).join('\n'));
  if (question.type === 'MQ' && Array.isArray(question.matchingPairs)) {
    details.push('Match each item:\n' + question.matchingPairs.map(pair => pair.left).join('\n'));
    details.push('Choices:\n' + shuffled([...question.matchingPairs.map(pair => pair.right), ...(question.extraRightMatches || [])]).join('\n'));
  }
  return { id: question.id, type: question.type, text: details.join('\n\n'),
    options: shuffleOptions ? shuffled(options) : options, marks, correct };
}
export function publicQuestions(snapshot: AssessmentSnapshot) {
  return snapshot.questions.map(({ id, type, text, options, marks }) => ({ id, type, text, options, marks }));
}
export function validateAnswers(snapshot: AssessmentSnapshot, answers: { questionId: number; value: string }[]) {
  const ids = new Set(snapshot.questions.map(question => question.id));
  const seen = new Set<number>();
  for (const answer of answers) {
    if (!ids.has(answer.questionId) || seen.has(answer.questionId)) throw new BadRequestException('Answers must reference distinct questions from this attempt');
    seen.add(answer.questionId);
  }
  return Object.fromEntries(answers.map(answer => [answer.questionId, answer.value]));
}
export function evaluate(snapshot: AssessmentSnapshot, answers: Record<string, string>) {
  const grades = snapshot.questions.map(question => ({ questionId: question.id, marks: question.correct === null ? null :
    (answers[question.id]?.trim() === question.correct.trim() ? question.marks : 0) }));
  return { grades, needsReview: grades.some(grade => grade.marks === null),
    score: grades.reduce((sum, grade) => sum + (grade.marks || 0), 0), total: snapshot.questions.reduce((sum, question) => sum + question.marks, 0) };
}
