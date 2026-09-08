import { PartialType } from '@nestjs/swagger';
import { CreateGeocodingDto } from './create-geocoding.dto';

export class UpdateGeocodingDto extends PartialType(CreateGeocodingDto) {}
