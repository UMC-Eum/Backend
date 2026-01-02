export class CreateNotificationDto {
  title: string;
  message: string;
}

export class UpdateNotificationDto {
  title?: string;
  message?: string;
  read?: boolean;
}
