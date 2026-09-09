import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

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
        ROUND(100.0 * COUNT(*) FILTER (WHERE passed = true) / NULLIF(COUNT(*) FILTER (WHERE status != 'IN_PROGRESS'), 0), 1) AS "passRate"
      FROM exam_attempts WHERE exam_id = $1
    `, [examId]);

    return stats;
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
      SELECT u.id AS "studentId", u.name, u.email,
        a.attempt_number AS "attemptNumber",
        a.mcq_score AS "mcqScore", a.coding_score AS "codingScore",
        a.total_score AS "totalScore", a.passed,
        a.start_time AS "startTime", a.end_time AS "endTime",
        EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60 AS "timeTakenMinutes",
        RANK() OVER (ORDER BY a.total_score DESC NULLS LAST) AS rank
      FROM exam_attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 AND a.status != 'IN_PROGRESS'
      ORDER BY a.total_score DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `, [examId, limit, offset]);

    const [{ total }] = await this.db.query(
      `SELECT COUNT(*) AS total FROM exam_attempts WHERE exam_id = $1 AND status != 'IN_PROGRESS'`, [examId]
    );

    return { rows, total: parseInt(total), page, limit };
  }

  async questionAnalytics(examId: number) {
    const mcqRows = await this.db.query(`
      SELECT
        eq.question_id AS "questionId",
        q."questionText" AS "questionText",
        q.options,
        q."correctAnswer" AS "correctAnswer",
        eq.marks,
        COUNT(a.id)::int AS "totalAttempts",
        COUNT(a.id) FILTER (WHERE (a.mcq_answers->>eq.question_id::text) = q."correctAnswer")::int AS "correct",
        COUNT(a.id) FILTER (WHERE (a.mcq_answers->>eq.question_id::text) IS NOT NULL AND (a.mcq_answers->>eq.question_id::text) != '' AND (a.mcq_answers->>eq.question_id::text) != q."correctAnswer")::int AS "incorrect",
        COUNT(a.id) FILTER (WHERE (a.mcq_answers->>eq.question_id::text) IS NULL OR (a.mcq_answers->>eq.question_id::text) = '')::int AS "unanswered",
        ROUND(100.0 * COUNT(a.id) FILTER (WHERE (a.mcq_answers->>eq.question_id::text) = q."correctAnswer") / NULLIF(COUNT(a.id) FILTER (WHERE (a.mcq_answers->>eq.question_id::text) IS NOT NULL AND (a.mcq_answers->>eq.question_id::text) != ''), 0), 1) AS "accuracy"
      FROM exam_questions eq
      JOIN questions q ON q.id = eq.question_id
      LEFT JOIN exam_attempts a ON a.exam_id = eq.exam_id AND a.status != 'IN_PROGRESS'
      WHERE eq.exam_id = $1 AND eq.section = 'A'
      GROUP BY eq.question_id, q."questionText", q.options, q."correctAnswer", eq.marks, eq.sort_order
      ORDER BY eq.sort_order ASC
    `, [examId]);

    const codingRows = await this.db.query(`
      SELECT
        eq.question_id AS "questionId",
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
      GROUP BY eq.question_id, q."problemStatement", eq.marks, eq.sort_order
      ORDER BY eq.sort_order ASC
    `, [examId]);

    return { mcq: mcqRows, coding: codingRows };
  }

  async studentDetail(examId: number, studentId: number) {
    const attempt = await this.db.query(`
      SELECT a.*, u.name, u.email FROM exam_attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 AND a.student_id = $2
      ORDER BY a.attempt_number DESC LIMIT 1
    `, [examId, studentId]);

    if (!attempt.length) return null;
    const att = attempt[0];

    const codingSubs = await this.db.query(`
      SELECT s.*, q."problemStatement" AS "problemStatement"
      FROM exam_coding_submissions s
      JOIN questions q ON q.id = s.question_id
      WHERE s.attempt_id = $1 AND s.is_final = true
    `, [att.id]);

    return { attempt: att, codingSubmissions: codingSubs };
  }

  async rankings(examId: number) {
    return this.db.query(`
      SELECT
        RANK() OVER (ORDER BY total_score DESC NULLS LAST) AS rank,
        u.id AS "studentId", u.name, u.email, u.registration_number AS "regNo",
        a.total_score AS "totalScore", a.mcq_score AS "mcqScore", a.coding_score AS "codingScore",
        a.passed, a.end_time AS "submittedAt"
      FROM exam_attempts a
      JOIN users u ON u.id = a.student_id
      WHERE a.exam_id = $1 AND a.status != 'IN_PROGRESS'
      ORDER BY total_score DESC NULLS LAST
    `, [examId]);
  }
}
