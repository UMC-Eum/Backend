import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser, AuthRequest } from './auth-user.types';

type CurrentUserField = keyof AuthenticatedUser;

type CurrentUserReturn<TField extends CurrentUserField | undefined> =
  TField extends 'userId'
    ? number | null
    : TField extends 'provider'
      ? string | null
      : AuthenticatedUser | null;

export const CurrentUser = createParamDecorator(
  <TField extends CurrentUserField | undefined>(
    field: TField,
    ctx: ExecutionContext,
  ): CurrentUserReturn<TField> => {
    const request = ctx.switchToHttp().getRequest<Request & AuthRequest>();
    const user = request.user ?? null;
    if (!field) {
      return user as CurrentUserReturn<TField>;
    }
    return (user?.[field] ?? null) as CurrentUserReturn<TField>;
  },
);
