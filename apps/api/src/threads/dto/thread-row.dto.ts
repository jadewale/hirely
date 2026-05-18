import { ApiProperty } from '@nestjs/swagger';

/**
 * Pipeline-view row shape, returned by every /api/threads endpoint.
 *
 * Keep this DTO stable -- the web client's TanStack Query keys hash
 * against the field names. Renaming a field forces a cache invalidation
 * on every active client.
 */
export class ThreadRowDto {
  @ApiProperty({ description: 'Our internal row UUID. Stable. Use this as the cache key.' })
  id!: string;

  @ApiProperty({ description: "Gmail's message ID for the FIRST message in the thread." })
  gmailMessageId!: string;

  @ApiProperty({ description: "Gmail's thread ID. Useful for deep-linking into the Gmail UI." })
  gmailThreadId!: string;

  @ApiProperty({ description: 'Original From header verbatim (e.g. "Jane Doe <jane@acme.com>").' })
  sender!: string;

  @ApiProperty({ description: 'Just the email address, lowercased -- useful for grouping by recruiter.' })
  senderEmail!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ type: String, nullable: true })
  snippet!: string | null;

  @ApiProperty({ description: 'ISO timestamp of the original message Date header.' })
  receivedAt!: string;

  @ApiProperty({
    enum: ['applied', 'phone_screen', 'interview', 'offer', 'rejected', 'ghosted'],
  })
  stage!: 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected' | 'ghosted';

  @ApiProperty({ description: 'Classifier confidence, 0-100.' })
  confidence!: number;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: 'Gmail labelIds we applied. Null until the labels worker runs.',
  })
  appliedLabelIds!: string[] | null;

  @ApiProperty({
    enum: ['idle', 'pending', 'ready', 'failed'],
    description: 'Draft generation state for this thread.',
  })
  draftStatus!: 'idle' | 'pending' | 'ready' | 'failed';

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Gmail draft ID; deep-link as https://mail.google.com/mail/u/0/#drafts/<draftId>",
  })
  gmailDraftId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Cached LLM-generated body so the UI can preview before opening Gmail.',
  })
  draftBody!: string | null;

  @ApiProperty({ type: String, nullable: true })
  draftedAt!: string | null;
}
