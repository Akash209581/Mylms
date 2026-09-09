import { ValidationPipe } from '@nestjs/common';
import { UpdateCourseLearningStateDto, UpdateLessonLearningStateDto } from './learning-state.dto';

describe('Learning state request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const validateLesson = (body: any) => pipe.transform(body, { type: 'body', metatype: UpdateLessonLearningStateDto });

  it.each([
    { videoSeconds: -1 }, { videoSeconds: Infinity }, { videoSeconds: NaN }, { videoSeconds: 604801 },
    { videoSeconds: '20' }, { videoSeconds: null }, { pdfPage: 0 }, { pdfPage: 1.5 }, { pdfPage: 100001 },
    { note: null }, { note: 'x'.repeat(20001) }, { bookmarked: 'false' },
  ])('rejects invalid position or note data %#', async body => {
    await expect(validateLesson(body)).rejects.toThrow();
  });

  it('accepts explicit false, zero and empty-note values without coercion', async () => {
    expect(await validateLesson({ bookmarked: false, videoSeconds: 0, pdfPage: 1, note: '' })).toMatchObject({
      bookmarked: false, videoSeconds: 0, pdfPage: 1, note: '',
    });
  });

  it('strips untrusted owner fields while retaining a partial update', async () => {
    const result = await validateLesson({ studentId: 99, lessonId: 1, note: 'Saved note' });
    expect(result).toEqual({ note: 'Saved note' });
  });

  it.each([{ saved: 'true' }, { lastLessonId: 0 }, { lastLessonId: 2.5 }, { lastLessonId: null }])('rejects malformed course preferences %#', async body => {
    await expect(pipe.transform(body, { type: 'body', metatype: UpdateCourseLearningStateDto })).rejects.toThrow();
  });
});
