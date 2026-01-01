import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PhotoService } from '../services/photo.service';
import { CreateUserPhotoDto } from '../dtos/create-user-photo.dto';
import { UpdateUserPhotoDto } from '../dtos/update-user-photo.dto';

@Controller('profile/photos')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post()
  create(@Body() dto: CreateUserPhotoDto) {
    return this.photoService.create(dto);
  }

  @Get(':userId')
  list(@Param('userId') userId: string) {
    return this.photoService.list(Number(userId));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserPhotoDto) {
    return this.photoService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.photoService.remove(Number(id));
  }
}

