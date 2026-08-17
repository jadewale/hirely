import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from '@career/contracts';
import { AuditEntryDto } from './audit-entry.dto';

class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

/** Paginated envelope returned by the admin audit viewer (RR-016). */
export class ListAuditResponseDto {
  @ApiProperty({ enum: [true] })
  success!: true;

  @ApiProperty({ type: [AuditEntryDto] })
  data!: AuditEntryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
