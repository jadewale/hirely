import { Global, Module } from '@nestjs/common';
import { db } from './index';

const DB_PROVIDER = {
  provide: 'DATABASE',
  useValue: db,
};

@Global()
@Module({
  providers: [DB_PROVIDER],
  exports: [DB_PROVIDER],
})
export class DbModule {}
