import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AppLogger } from 'src/common/logger/app-logger.service';

@Injectable()
export class CallsService {
  private readonly logger = new AppLogger();

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.call.findMany({
      include: { conversation: true },
    });
  }

  async findById(id: string) {
    const call = await this.prisma.call.findUnique({
      where: { id },
      include: { conversation: { include: { messages: true } } },
    });

    if (!call) {
      throw new NotFoundException(`Call ${id} not found`);
    }

    return call;
  }
}
