import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Question } from '../entities/question.entity';
import { CourseContentService, CourseReader } from '../common/course-content.service';
import { canEditCourse } from '../common/course-access';
import { UserRole } from '../entities/user.entity';
import { AssessmentSnapshot, boundedInteger, evaluate, publicQuestions, shuffled, snapshotQuestion, validateAnswers } from './assessment-policy';
import { GradeAttemptDto, SaveAnswersDto } from './assessment.dto';

@Injectable()
export class AssessmentService {
  constructor(private readonly db: DataSource, private readonly access: CourseContentService) {}

  async managedLessons(user: CourseReader) {
    if (user.role === UserRole.STUDENT) throw new ForbiddenException('Staff access required');
    const qb = this.db.getRepository(Lesson).createQueryBuilder('lesson')
      .innerJoin('lesson.chapter','chapter').innerJoin('chapter.module','module').innerJoin('module.course','course')
      .where("lesson.rich_content->>'type' = 'quiz-builder'")
      .select(['lesson.id','lesson.title']).addSelect('course.title','courseTitle')
      .orderBy('lesson.id','DESC').take(100);
    if (user.role !== UserRole.SUPERADMIN) {
      if (!user.collegeId) throw new ForbiddenException('College assignment required');
      qb.andWhere('course.college_id=:collegeId',{collegeId:user.collegeId});
      if (user.role === UserRole.INSTRUCTOR) qb.andWhere('course.instructor_id=:userId',{userId:user.sub});
    }
    return qb.getRawMany();
  }

  private async lesson(user: CourseReader, id: number, manage = false) {
    const lesson = await this.db.getRepository(Lesson).findOne({ where: { id }, relations: ['chapter', 'chapter.module'] });
    if (!lesson || (!manage && !lesson.published)) throw new NotFoundException('Assessment lesson unavailable');
    const course = await this.access.getCourse(lesson.chapter.module.courseId);
    if (manage ? !canEditCourse(user, course) : user.role !== UserRole.STUDENT || !await this.access.canRead(user, course)) {
      throw new ForbiddenException('Assessment access denied');
    }
    if (lesson.content?.type !== 'quiz-builder') throw new BadRequestException('This lesson is not a question-bank assessment');
    return { lesson, course };
  }

  /** A published lesson's existing authoring definition is materialized into the legacy quiz store once. */
  private async definition(manager: EntityManager, lesson: Lesson, course: any) {
    await manager.query('SELECT pg_advisory_xact_lock(6006, $1)', [lesson.id]);
    const [existing] = await manager.query('SELECT q.* FROM lesson_assessments l JOIN quizzes q ON q.id=l.quiz_id WHERE l.lesson_id=$1', [lesson.id]);
    if (existing) return existing;
    const content = lesson.content || {}, settings = content.settings || {};
    const questionIds = content.questionIds;
    if (!Array.isArray(questionIds) || !questionIds.length || questionIds.length > 200 || questionIds.some(id => !Number.isInteger(id) || id <= 0) || new Set(questionIds).size !== questionIds.length) {
      throw new BadRequestException('The instructor must select 1–200 distinct question-bank questions');
    }
    const questions = await manager.getRepository(Question).find({ where: { id: In(questionIds) } });
    if (questions.length !== questionIds.length || questions.some(question => !question.isActive || (question.collegeId && question.collegeId !== course.collegeId))) {
      throw new BadRequestException('The assessment includes unavailable question-bank content');
    }
    const duration = boundedInteger(settings.timeLimitMinutes, 20, 1, 360);
    const pass = boundedInteger(settings.passPercentage, 40, 0, 100);
    const attempts = boundedInteger(settings.maxAttempts, 1, 1, 20);
    const count = boundedInteger(settings.questionsToServe, 0, 0, questionIds.length);
    const [quiz] = await manager.query(`INSERT INTO quizzes(title,description,duration_minutes,passing_score,max_attempts,status,created_by_id,config)
      VALUES($1,$2,$3,$4,$5,'APPROVED',$6,$7) RETURNING *`, [lesson.title, lesson.description || '', duration, pass, attempts, course.instructorId,
      JSON.stringify({ version: 1, lessonVersion: lesson.version, questionIds, questionsToServe: count, shuffleQuestions: !!settings.shuffleQuestions, shuffleOptions: !!settings.shuffleOptions })]);
    for (let i = 0; i < questionIds.length; i++) await manager.query('INSERT INTO quiz_questions(quiz_id,question_id,marks,sort_order) VALUES($1,$2,1,$3)', [quiz.id, questionIds[i], i]);
    await manager.query('INSERT INTO lesson_assessments(lesson_id,quiz_id) VALUES($1,$2)', [lesson.id, quiz.id]);
    return quiz;
  }

  async start(user: CourseReader, lessonId: number) {
    const { lesson, course } = await this.lesson(user, lessonId);
    return this.db.transaction(async manager => {
      const quiz = await this.definition(manager, lesson, course);
      await manager.query('SELECT pg_advisory_xact_lock($1,$2)', [quiz.id, user.sub]);
      const attempts = await manager.query(`SELECT a.id,a.status,r.deadline_at FROM quiz_attempts a
        LEFT JOIN assessment_attempt_runtime r ON r.attempt_id=a.id WHERE a.quiz_id=$1 AND a.student_id=$2 ORDER BY a.attempt_number DESC`, [quiz.id, user.sub]);
      const current = attempts.find(attempt => attempt.status === 'IN_PROGRESS');
      if (current) return this.readWithin(manager, user, current.id, false);
      if (attempts.length >= quiz.max_attempts) throw new ConflictException('Attempt limit reached');
      const links = await manager.query('SELECT question_id, marks FROM quiz_questions WHERE quiz_id=$1 ORDER BY sort_order,id', [quiz.id]);
      if (!links.length) throw new BadRequestException('Assessment has no configured questions');
      const questions = await manager.getRepository(Question).find({ where: { id: In(links.map(link => link.question_id)) } });
      if (questions.length !== links.length || questions.some(question => !question.isActive || (question.collegeId && question.collegeId !== course.collegeId))) throw new BadRequestException('Assessment questions are unavailable');
      let selected = links;
      const count = quiz.config?.questionsToServe || 0;
      if (quiz.config?.shuffleQuestions || count) selected = shuffled(selected);
      if (count) selected = selected.slice(0, count);
      const snapshot: AssessmentSnapshot = { version: 1, title: quiz.title, passPercentage: quiz.passing_score,
        questions: selected.map(link => snapshotQuestion(questions.find(question => question.id === link.question_id), link.marks, !!quiz.config?.shuffleOptions)) };
      const [attempt] = await manager.query(`INSERT INTO quiz_attempts(quiz_id,student_id,total_marks,attempt_number,start_time,answers)
        VALUES($1,$2,$3,$4,now() AT TIME ZONE 'UTC','{}') RETURNING id`, [quiz.id, user.sub, snapshot.questions.reduce((sum,q) => sum+q.marks,0), attempts.length + 1]);
      await manager.query(`INSERT INTO assessment_attempt_runtime(attempt_id,lesson_id,deadline_at,snapshot)
        VALUES($1,$2,now()+($3 * interval '1 minute'),$4)`, [attempt.id,lesson.id,quiz.duration_minutes,JSON.stringify(snapshot)]);
      return this.readWithin(manager,user,attempt.id,false);
    });
  }

  private async row(manager: EntityManager, attemptId: number) {
    const [row] = await manager.query(`SELECT a.*,r.lesson_id,r.deadline_at,r.snapshot,r.state,r.grading,r.feedback,r.released_at,
      now() >= r.deadline_at AS expired FROM quiz_attempts a JOIN assessment_attempt_runtime r ON r.attempt_id=a.id WHERE a.id=$1 FOR UPDATE OF a,r`, [attemptId]);
    if (!row) throw new NotFoundException('Attempt not found');
    return row;
  }
  private async finish(manager: EntityManager, row: any) {
    if (row.state !== 'IN_PROGRESS') return;
    const result = evaluate(row.snapshot, row.answers || {});
    const state = result.needsReview ? 'SUBMITTED' : 'RELEASED';
    await manager.query(`UPDATE quiz_attempts SET status='SUBMITTED',end_time=now() AT TIME ZONE 'UTC',updated_at=now() AT TIME ZONE 'UTC',score=$2,passed=$3 WHERE id=$1`,
      [row.id, result.score, result.needsReview ? null : result.score * 100 >= result.total * row.snapshot.passPercentage]);
    await manager.query(`UPDATE assessment_attempt_runtime SET state=$2,grading=$3,released_at=CASE WHEN $2='RELEASED' THEN now() ELSE NULL END WHERE attempt_id=$1`, [row.id,state,JSON.stringify(result.grades)]);
    Object.assign(row,{ state, score: result.score, passed: result.needsReview ? null : result.score * 100 >= result.total * row.snapshot.passPercentage, grading: result.grades });
  }
  private response(row: any, staff: boolean) {
    const released = row.state === 'RELEASED';
    return { id: row.id, lessonId: row.lesson_id, attemptNumber: row.attempt_number, state: row.state,
      deadlineAt: row.deadline_at, serverTime: new Date().toISOString(), title: row.snapshot.title,
      questions: publicQuestions(row.snapshot), answers: row.answers || {}, totalMarks: row.total_marks,
      score: staff || released ? row.score : null, passed: staff || released ? row.passed : null,
      grading: staff || released ? row.grading : null, feedback: staff || released ? row.feedback : '',
      ...(staff ? { studentId: row.student_id } : {}) };
  }
  private async readWithin(manager: EntityManager, user: CourseReader, attemptId: number, staff: boolean) {
    const row = await this.row(manager,attemptId);
    if (!staff && row.student_id !== user.sub) throw new ForbiddenException('Attempt belongs to another student');
    await this.lesson(user,row.lesson_id,staff);
    if (row.expired) await this.finish(manager,row);
    return this.response(row,staff);
  }
  async read(user: CourseReader, id: number) {
    return this.db.transaction(manager => this.readWithin(manager,user,id,user.role !== UserRole.STUDENT));
  }
  async save(user: CourseReader, id: number, body: SaveAnswersDto, submit = false) {
    return this.db.transaction(async manager => {
      const row = await this.row(manager,id);
      if (row.student_id !== user.sub || user.role !== UserRole.STUDENT) throw new ForbiddenException('Attempt belongs to another student');
      await this.lesson(user,row.lesson_id);
      if (row.state !== 'IN_PROGRESS') return this.response(row,false);
      if (row.expired) { await this.finish(manager,row); return this.response(row,false); }
      row.answers = { ...row.answers, ...validateAnswers(row.snapshot,body.answers) };
      await manager.query("UPDATE quiz_attempts SET answers=$2,updated_at=now() AT TIME ZONE 'UTC' WHERE id=$1",[id,JSON.stringify(row.answers)]);
      if (submit) await this.finish(manager,row);
      return this.response(row,false);
    });
  }
  async list(user: CourseReader, lessonId: number) {
    const staff = user.role !== UserRole.STUDENT;
    await this.lesson(user,lessonId,staff);
    return this.db.query(`SELECT a.id,a.attempt_number AS "attemptNumber",a.student_id AS "studentId",r.state,r.deadline_at AS "deadlineAt"
      FROM quiz_attempts a JOIN assessment_attempt_runtime r ON r.attempt_id=a.id WHERE r.lesson_id=$1 AND ($2::integer IS NULL OR a.student_id=$2)
      ORDER BY a.id DESC LIMIT 100`,[lessonId,staff ? null : user.sub]);
  }
  async grade(user: CourseReader, id: number, body: GradeAttemptDto) {
    return this.db.transaction(async manager => {
      const row = await this.row(manager,id);
      await this.lesson(user,row.lesson_id,true);
      if (row.state === 'IN_PROGRESS') throw new ConflictException('The student has not submitted this attempt');
      if (row.state === 'RELEASED') throw new ConflictException('Released grades are immutable');
      const snapshot: AssessmentSnapshot = row.snapshot;
      if (body.grades.length !== snapshot.questions.length || new Set(body.grades.map(grade => grade.questionId)).size !== snapshot.questions.length) throw new BadRequestException('Grade each question exactly once');
      for (const grade of body.grades) {
        const question = snapshot.questions.find(question => question.id === grade.questionId);
        if (!question || grade.marks > question.marks) throw new BadRequestException('Grade exceeds available marks');
      }
      const score = body.grades.reduce((sum,grade) => sum+grade.marks,0);
      const passed = score * 100 >= row.total_marks * snapshot.passPercentage;
      await manager.query("UPDATE quiz_attempts SET score=$2,passed=$3,updated_at=now() AT TIME ZONE 'UTC' WHERE id=$1",[id,score,passed]);
      await manager.query(`UPDATE assessment_attempt_runtime SET state=$2,grading=$3,feedback=$4,graded_by=$5,graded_at=now(),released_at=CASE WHEN $6 THEN now() ELSE NULL END WHERE attempt_id=$1`,
        [id,body.release ? 'RELEASED' : 'GRADED',JSON.stringify(body.grades),body.feedback,user.sub,body.release]);
      return this.readWithin(manager,user,id,true);
    });
  }
}
