import { evaluate, publicQuestions, snapshotQuestion, validateAnswers, boundedInteger } from './assessment-policy';
describe('Assessment snapshots and grading', () => {
  const question = snapshotQuestion({ id: 1, type: 'MCQ', questionText: 'Choose', options: ['One','Two'], correctAnswer: 'Two' },2,true);
  const snapshot = { version: 1 as const, title: 'Quiz', passPercentage: 50, questions: [question] };
  it('excludes answer keys from the student projection even when options are shuffled', () => {
    expect(publicQuestions(snapshot)[0]).toEqual({ id:1,type:'MCQ',text:'Choose',options:expect.arrayContaining(['One','Two']),marks:2 });
    expect(JSON.stringify(publicQuestions(snapshot))).not.toContain('correct');
    expect(question.correct).toBe('Two');
  });
  it('grades against the frozen answer instead of a client score', () => {
    expect(evaluate(snapshot,{'1':'Two'})).toMatchObject({score:2,total:2,needsReview:false});
    expect(evaluate(snapshot,{'1':'One'})).toMatchObject({score:0,total:2});
  });
  it('requires review for programming answers without pretending to execute code', () => {
    const pq = snapshotQuestion({id:2,type:'PQ',questionText:'Write code'},3,false);
    expect(evaluate({...snapshot,questions:[pq]},{'2':'print(1)'})).toMatchObject({score:0,needsReview:true});
  });
  it('rejects foreign and duplicate question answers', () => {
    expect(() => validateAnswers(snapshot,[{questionId:2,value:'x'}])).toThrow();
    expect(() => validateAnswers(snapshot,[{questionId:1,value:'One'},{questionId:1,value:'Two'}])).toThrow();
  });
  it('rejects malformed keys and unbounded timers while preserving a valid zero pass threshold', () => {
    expect(() => snapshotQuestion({id:1,type:'MCQ',options:['A'],correctAnswer:'B'},1,false)).toThrow();
    expect(() => boundedInteger(Infinity,20,1,360)).toThrow();
    expect(boundedInteger(0,40,0,100)).toBe(0);
  });
});
