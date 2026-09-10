import { questionDuplicateKey } from './question-duplicate.util';

describe('question duplicate key', () => {
  it('treats spacing and case as the same question', () => {
    expect(questionDuplicateKey('MCQ', '  What is  2+2 ')).toBe(
      questionDuplicateKey('mcq', 'what is 2+2'),
    );
  });

  it('keeps different titles distinct', () => {
    expect(questionDuplicateKey('MCQ', 'What is 2+2')).not.toBe(
      questionDuplicateKey('MCQ', 'What is 3+3'),
    );
  });
});
