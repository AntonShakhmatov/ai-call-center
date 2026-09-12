import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AppLogger } from 'src/common/logger/app-logger.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/voice',
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new AppLogger(VoiceGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id} (voice namespace)`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id} (voice namespace)`);
  }
}
