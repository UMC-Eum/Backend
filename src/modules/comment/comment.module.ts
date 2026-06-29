import { Module } from '@nestjs/common';
import { CommentController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';
import { CommentRepository } from './repositories/comment.repository';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClubModule } from '../club/club.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, AuthModule, ClubModule, NotificationModule],
  controllers: [CommentController],
  providers: [CommentService, CommentRepository],
  exports: [CommentService],
})
export class CommentModule {}
