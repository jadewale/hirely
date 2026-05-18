import { ApiProperty } from '@nestjs/swagger';

/**
 * Snapshot of the most recent inbox-scan run for the signed-in user.
 *
 * The web onboarding "Scanning..." step polls this every ~1.5s. The UI
 * uses `classifiedCount / discoveredTotal` to render the progress bar
 * and `status` to decide whether to advance to the pipeline view.
 *
 * Returns null when the user has never connected Gmail. The frontend
 * treats that as "still on connect step" rather than 404 so the polling
 * loop doesn't spam errors during the consent-screen redirect window.
 */
export class InboxScanStatusResponseDto {
  @ApiProperty({
    enum: ['listing', 'classifying', 'completed', 'failed', 'idle'],
    description:
      '`idle` -- no scan has ever started for this user. `listing`/`classifying`/`completed`/`failed` reflect the inbox_scan_progress row state.',
  })
  status!:
    | 'idle'
    | 'listing'
    | 'classifying'
    | 'completed'
    | 'failed';

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Stable identifier for this scan run. Null when status=idle.',
  })
  runId!: string | null;

  @ApiProperty({
    description:
      'How many messages we asked Gmail for (300 in normal config).',
  })
  targetTotal!: number;

  @ApiProperty({
    description:
      'How many messages Gmail actually returned. Bounded above by targetTotal.',
  })
  discoveredTotal!: number;

  @ApiProperty({
    description: 'How many messages have been classified so far.',
  })
  classifiedCount!: number;

  @ApiProperty({
    description: 'Total fanout batches the run was split into.',
  })
  batchesTotal!: number;

  @ApiProperty({
    description: 'Number of batches that have completed classification.',
  })
  batchesCompleted!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'ISO timestamp of when the scan finished. Null while in progress.',
  })
  completedAt!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Human-readable error from the most recent failure. Null when status != failed.',
  })
  errorMessage!: string | null;
}
