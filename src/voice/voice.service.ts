import { Injectable } from '@nestjs/common';
import { AppLogger } from 'src/common/logger/app-logger.service';

/**
 * Placeholder for the realtime voice layer.
 *
 * Future responsibilities (NOT implemented yet):
 * - speech recognition (ASR)
 * - audio ingestion/forwarding
 * - TTS playback
 * - LLM streaming bridging
 */
@Injectable()
export class VoiceService {
  private readonly logger = new AppLogger(VoiceService.name);

  constructor() {
    this.logger.log('VoiceService ready (realtime voice processing not implemented yet)');
  }
}
