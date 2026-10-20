
import { forwardRef, Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { GeocodingController } from './geocoding.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [GeocodingService],
  exports: [GeocodingService],
  controllers: [GeocodingController],
})
export class GeocodingModule {}
