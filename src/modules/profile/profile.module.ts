import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { PhotoController } from './controllers/photo.controller';
import { VibeController } from './controllers/vibe.controller';
import { PhotoService } from './services/photo.service';
import { ProfileService } from './services/profile.service';
import { VibeService } from './services/vibe.service';
import { PhotoRepository } from './repositories/photo.repository';
import { ProfileRepository } from './repositories/profile.repository';
import { VibeRepository } from './repositories/vibe.repository';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { UpdateProfileDto } from './dtos/update-profile.dto';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileController, PhotoController, VibeController],
  providers: [ProfileService, PhotoService, VibeService, ProfileRepository, PhotoRepository, VibeRepository],
  exports: [ProfileService, PhotoService, VibeService],
})
export class ProfileModule {}
