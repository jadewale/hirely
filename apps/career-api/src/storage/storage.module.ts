import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

/**
 * Object-storage access for the career-platform. Currently only résumé uploads
 * (RR-018) use it; future file features (portfolios, exports) import this
 * module rather than constructing their own S3 client.
 */
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class StorageModule {}
