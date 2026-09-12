import { Controller, Get, Param } from '@nestjs/common';
import { CallsService } from './calls.service';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  findAll() {
    return this.callsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callsService.findById(id);
  }
}
