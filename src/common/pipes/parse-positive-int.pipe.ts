import { PipeTransform } from '@nestjs/common';
import { AppException } from '../errors/app.exception';

export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const n = Number(value);

    if (!Number.isInteger(n) || n <= 0) {
      throw new AppException('VALIDATION_INVALID_FORMAT');
    }

    return n;
  }
}
