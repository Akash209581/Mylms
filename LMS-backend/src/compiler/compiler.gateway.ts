import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ExecutionStatus, ExecutionJobResult } from './compiler.constants';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/code-execution',
})
export class CompilerGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CompilerGateway.name);

  @SubscribeMessage('join_job')
  handleJoinJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    if (data?.jobId) {
      client.join(`job:${data.jobId}`);
      this.logger.debug(`Client ${client.id} joined room job:${data.jobId}`);
      return { event: 'joined', jobId: data.jobId };
    }
  }

  /** Emit queue status update with current queue position */
  emitQueueStatus(jobId: string, position: number) {
    if (!this.server) return;
    this.server.to(`job:${jobId}`).emit('queue_status', {
      jobId,
      status: ExecutionStatus.QUEUED,
      position,
      timestamp: new Date().toISOString(),
    });
  }

  /** Emit test case progress update while running */
  emitJobProgress(jobId: string, currentCase: number, totalCases: number) {
    if (!this.server) return;
    this.server.to(`job:${jobId}`).emit('job_progress', {
      jobId,
      status: ExecutionStatus.RUNNING,
      currentCase,
      totalCases,
      timestamp: new Date().toISOString(),
    });
  }

  /** Emit completed execution result */
  emitJobCompleted(jobId: string, result: Partial<ExecutionJobResult>) {
    if (!this.server) return;
    this.server.to(`job:${jobId}`).emit('job_completed', {
      jobId,
      result,
      timestamp: new Date().toISOString(),
    });
  }

  /** Emit failed or error state */
  emitJobFailed(jobId: string, error: string) {
    if (!this.server) return;
    this.server.to(`job:${jobId}`).emit('job_failed', {
      jobId,
      status: ExecutionStatus.SYSTEM_ERROR,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
