import { Module } from '@nestjs/common';
import { ArticleController } from './controllers/article.controller';
import { ArticleService } from './services/article.service';
import { ArticleRepository } from './repositories/article.repository';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [ArticleController],
  providers: [ArticleService, ArticleRepository],
})
export class ArticleModule {}
