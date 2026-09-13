import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { normalizeMcqLetter } from '../common/mcq-answer.util';

@Injectable()
export class ExamAnalyticsService {
  constructor(private readonly db: DataSource) {}

  async overview(examId: number) {
    const [stats] = await this.db.query(`
      SELECT
        COUNT(*) AS "totalAttempts",
        COUNT(*) FILTER (WHERE status != 'IN_PROGRESS') AS "submitted",
        COUNT(*) FILTER (WHERE passed = true) AS "passed",
        COUNT(*) FILTER (WHERE passed = false AND status != 'IN_PROGRESS') AS "failed",
        ROUND(AVG(total_score)::numeric, 2) AS "avgScore",
        ROUND(MAX(total_score)::numeric, 2) AS "maxScore",
        ROUND(MIN(total_score) FILTER (WHERE status != 'IN_PROGRESS')::numeric, 2) AS "minScore",
        ROUND(AVG(mcq_score)::numeric, 2) AS "avgMcqScore",
        ROUND(AVG(coding_score)::numeric, 2) AS "avgCodingScore",
        ROUND(100.0 * COUNT(*) FILTER (WHERE passed = true) / NULLIF(COUNT(*) FILTER (WHERE status != 'IN_PROGRESS'), 0), 1) AS "passRate",
        ROUND(AVG(COALESCE(face_coverage_percent, 100))::numeric, 1) AS "avgFaceCoverage",
        COALESCE(SUM(face_violations_count), 0)::int AS "totalFaceViolations",
        COALESCE(SUM(tab_switch_count), 0)::int AS "totalTabSwitches",
        COUNT(*) FILTER (WHERE tab_switch_count > 0)::int AS "studentsWithTabSwitches",
        ROUND(AVG(COALESCE(inactivity_duration_seconds, 0))::numeric, 0)::int AS "avgInactivitySeconds",
        COALESCE(MAX(inactivity_duration_seconds), 0)::int AS "maxInactivitySeconds"
      FROM exam_attempts WHERE exam_id = $1
    `, [examId]);

    const [{ assigned }] = await this.db.query(
      `SELECT COUNT(*)::int AS assigned FROM exam_assignments WHERE exam_id = $1`,
      [examId],
    );

    return { ...stats, assigned: assigned ?? 0 };
  }

  async scoreDistribution(examId: number) {
    const exam = await this.db.query(`SELECT total_marks AS "totalMarks" FROM exams WHERE id = $1`, [examId]);
    const totalMarks = exam[0]?.totalMarks || 100;
    const buckets = 10;
    const bucketSize = totalMarks / buckets;

    const rows = await this.db.query(`
      SELECT
        FLOOR(total_score / $2) AS bucket,
        COUNT(*) AS count
      FROM exam_attempts
      WHERE exam_id = $1 AND status != 'IN_PROGRESS' AND total_score IS NOT NULL
      GROUP BY bucket ORDER BY bucket
    `, [examId, bucketSize]);

    return rows.map(r => ({
      range: `${Math.round(r.bucket * bucketSize)}–${Math.round((+r.bucket + 1) * bucketSize)}`,
      count: parseInt(r.count),
    }));
  }

  async studentPerformance(examId: number, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const rows = await this.db.query(`
      SELECT u.id AS "studentId", u.name, u.email, u.registration_number AS "regNo",
        a.id AS "attemptId",
        a.attempt_number AS "attemptNumber",
        a.mcq_score AS "mcqScore", a.coding_score AS "codingScore",
        a.total_score AS "totalScore", a.passed,
        COALESCE(a.tab_switch_count, 0) AS "tabSwitchCount",
        a.tab_switch_log AS "tabSwitchLog",
        COALESCE(a.face_coverage_percent, 100) AS "faceCoveragePercent",
        COALESCE(a.face_violations_count, 0) AS "faceViolationsCount",
        COALESCE(a.inactivity_duration_seconds, 0) AS "inactivityDurationSeconds",
        a.coding_timeline AS "codingTimeline",
        a.auto_submitted_reason AS "autoSubmittedReason",
        a.start_time AS "startTime", a.end_time AS "endTime",
        EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60 AS "timeTakenMinutes",
        RANK() OVER (ORDER BY a.total_score DESC NULLS LAST) AS rank
      FROM exam_attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 AND a.status != 'IN_PROGRESS'
      ORDER BY a.total_score DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `, [examId, limit, offset]);

    const formattedRows = rows.map((r: any) => {
      const timeline: any[] = Array.isArray(r.codingTimeline) ? r.codingTimeline : (typeof r.codingTimeline === 'string' ? JSON.parse(r.codingTimeline || '[]') : []);
      const wrongCount = timeline.filter(t => t.status && t.status !== 'ACCEPTED').length;
      const correctCount = timeline.filter(t => t.status === 'ACCEPTED').length;
      return {
        ...r,
        wrongSubmissionsCount: wrongCount,
        correctSubmissionsCount: correctCount,
      };
    });

    const [{ total }] = await this.db.query(
      `SELECT COUNT(*) AS total FROM exam_attempts WHERE exam_id = $1 AND status != 'IN_PROGRESS'`, [examId]
    );

    return { rows: formattedRows, total: parseInt(total), page, limit };
  }

  async questionAnalytics(examId: number) {
    const mcqMeta = await this.db.query(`
      SELECT
        eq.question_id AS "questionId",
        q."questionText" AS "questionText",
        q."problemStatement" AS "problemStatement",
        q.options,
        q."correctAnswer" AS "correctAnswer",
        eq.marks,
        eq.sort_order AS "sortOrder"
      FROM exam_questions eq
      JOIN questions q ON q.id = eq.question_id
      WHERE eq.exam_id = $1 AND eq.section = 'A'
      ORDER BY eq.sort_order ASC
    `, [examId]);

    const attempts = await this.db.query(`
      SELECT mcq_answers AS "mcqAnswers", coding_timeline AS "codingTimeline", u.name AS "studentName"
      FROM exam_attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 AND a.status != 'IN_PROGRESS'
    `, [examId]);

    const mcq = (mcqMeta || []).map((q: any) => {
      const options: string[] = Array.isArray(q.options)
        ? q.options
        : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []);
      const correctLetter = normalizeMcqLetter(q.correctAnswer, options);
      const optionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      for (const a of attempts) {
        const raw = a.mcqAnswers ?? a.mcq_answers;
        const answers = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
        const given = answers[String(q.questionId)] ?? answers[q.questionId];
        if (!given) {
          unanswered++;
          continue;
        }
        const givenLetter = normalizeMcqLetter(given, options);
        if (givenLetter && optionCounts[givenLetter] != null) optionCounts[givenLetter]++;
        if (givenLetter && givenLetter === correctLetter) correct++;
        else incorrect++;
      }

      const totalAttempts = attempts.length;
      const accuracy = totalAttempts ? Math.round((1000 * correct) / totalAttempts) / 10 : 0;
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        problemStatement: q.problemStatement,
        options,
        correctAnswer: correctLetter,
        marks: q.marks,
        totalAttempts,
        correct,
        incorrect,
        unanswered,
        accuracy,
        optionCounts,
      };
    });

    const codingRows = await this.db.query(`
      SELECT
        eq.question_id AS "questionId",
        q."questionText" AS "questionText",
        q."problemStatement" AS "problemStatement",
        eq.marks,
        COUNT(DISTINCT s.attempt_id)::int AS "submissions",
        COUNT(DISTINCT s.attempt_id) FILTER (WHERE s.status = 'ACCEPTED')::int AS "accepted",
        ROUND(AVG(s.score)::numeric, 2) AS "avgScore",
        ROUND(AVG(s.passed_cases::float / NULLIF(s.total_cases, 0) * 100)::numeric, 1) AS "avgPublicPassRate"
      FROM exam_questions eq
      JOIN questions q ON q.id = eq.question_id
      LEFT JOIN exam_coding_submissions s ON s.question_id = eq.question_id AND s.is_final = true
      LEFT JOIN exam_attempts a ON a.id = s.attempt_id AND a.exam_id = eq.exam_id AND a.status != 'IN_PROGRESS'
      WHERE eq.exam_id = $1 AND eq.section = 'B'
      GROUP BY eq.question_id, q."questionText", q."problemStatement", eq.marks, eq.sort_order
      ORDER BY eq.sort_order ASC
    `, [examId]);

    // Aggregate timeline correct timestamps and wrong submissions per question
    const enhancedCoding = (codingRows || []).map((cr: any) => {
      let wrongCount = 0;
      let totalRuns = 0;
      const correctTimeline: Array<{ studentName: string; timestamp: string; elapsedSeconds: number; score: number }> = [];

      for (const a of attempts) {
        const rawTl = a.codingTimeline ?? a.coding_timeline;
        const tl: any[] = Array.isArray(rawTl) ? rawTl : (typeof rawTl === 'string' ? JSON.parse(rawTl || '[]') : []);
        const questionEvents = tl.filter((ev: any) => Number(ev.questionId) === Number(cr.questionId));
        totalRuns += questionEvents.length;
        wrongCount += questionEvents.filter((ev: any) => ev.status !== 'ACCEPTED').length;

        const firstAccept = questionEvents.find((ev: any) => ev.status === 'ACCEPTED');
        if (firstAccept) {
          correctTimeline.push({
            studentName: a.studentName || 'Student',
            timestamp: firstAccept.timestamp,
            elapsedSeconds: firstAccept.elapsedSeconds || 0,
            score: firstAccept.score || cr.marks || 10,
          });
        }
      }

      return {
        ...cr,
        wrongSubmissions: wrongCount,
        totalRuns,
        correctTimeline,
      };
    });

    return { mcq, coding: enhancedCoding };
  }

  async studentDetail(examId: number, studentId: number) {
    const attempt = await this.db.query(`
      SELECT a.*, u.name, u.email, u.registration_number AS "regNo" FROM exam_attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 AND a.student_id = $2
      ORDER BY a.attempt_number DESC LIMIT 1
    `, [examId, studentId]);

    if (!attempt.length) return null;
    const att = attempt[0];

    const codingSubs = await this.db.query(`
      SELECT s.*, q."questionText" AS "questionText", q."problemStatement" AS "problemStatement"
      FROM exam_coding_submissions s
      JOIN questions q ON q.id = s.question_id
      WHERE s.attempt_id = $1
      ORDER BY s.submitted_at DESC
    `, [att.id]);

    return {
      attempt: {
        ...att,
        faceCoveragePercent: Number(att.face_coverage_percent ?? att.faceCoveragePercent ?? 100),
        faceViolationsCount: Number(att.face_violations_count ?? att.faceViolationsCount ?? 0),
        inactivityDurationSeconds: Number(att.inactivity_duration_seconds ?? att.inactivityDurationSeconds ?? 0),
        tabSwitchCount: Number(att.tab_switch_count ?? att.tabSwitchCount ?? 0),
        tabSwitchLog: att.tab_switch_log ?? att.tabSwitchLog ?? [],
        codingTimeline: att.coding_timeline ?? att.codingTimeline ?? [],
      },
      codingSubmissions: codingSubs,
    };
  }

  async rankings(examId: number) {
    return this.db.query(`
      SELECT
        RANK() OVER (ORDER BY total_score DESC NULLS LAST) AS rank,
        u.id AS "studentId", u.name, u.email, u.registration_number AS "regNo",
        a.total_score AS "totalScore", a.mcq_score AS "mcqScore", a.coding_score AS "codingScore",
        a.face_coverage_percent AS "faceCoveragePercent",
        a.inactivity_duration_seconds AS "inactivityDurationSeconds",
        a.tab_switch_count AS "tabSwitchCount",
        a.passed, a.end_time AS "submittedAt"
      FROM exam_attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 AND a.status != 'IN_PROGRESS'
      ORDER BY total_score DESC NULLS LAST
    `, [examId]);
  }
}
