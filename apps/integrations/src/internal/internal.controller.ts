import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('internal')
@UseGuards(ApiKeyGuard)
export class InternalController {
  @Get('ping')
  ping() {
    return { status: 'ok', service: 'integrations' };
  }
}
