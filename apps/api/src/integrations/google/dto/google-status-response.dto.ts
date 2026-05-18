import { ApiProperty } from '@nestjs/swagger';

export class GoogleStatusResponseDto {
  @ApiProperty({
    description:
      'True when the user has a linked Google account at all (sign-in only counts).',
  })
  linked!: boolean;

  @ApiProperty({
    description:
      'Email address on the linked Google account, or null if no account is linked.',
    nullable: true,
    example: 'alex.rivera@gmail.com',
  })
  email!: string | null;

  @ApiProperty({
    description:
      'True when every Gmail scope Hirely requests has been granted on the linked Google account.',
  })
  inboxConnected!: boolean;

  @ApiProperty({
    description:
      'True when every Calendar scope Hirely requests has been granted on the linked Google account.',
  })
  calendarConnected!: boolean;
}
