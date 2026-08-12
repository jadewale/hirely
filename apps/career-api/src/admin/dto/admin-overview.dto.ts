import { ApiProperty } from '@nestjs/swagger';

export class AdminOverviewDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: 'admin-only' })
  message!: string;

  @ApiProperty({ description: 'Id of the authenticated admin' })
  userId!: string;

  @ApiProperty({ description: 'Role of the requester', example: 'ADMIN' })
  role!: string;
}
