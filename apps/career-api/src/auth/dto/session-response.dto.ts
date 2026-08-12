import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ description: 'Authenticated user id (UUID)' })
  id!: string;

  @ApiProperty({ description: 'Authenticated user email' })
  email!: string;

  @ApiProperty({ description: 'Display name', nullable: true })
  name!: string;

  @ApiProperty({
    description: 'Authorization role',
    enum: ['CANDIDATE', 'ASSISTANT', 'ADMIN'],
    example: 'CANDIDATE',
  })
  role!: string;
}
