import { Injectable, Logger } from '@nestjs/common';
import { MezonClient } from 'mezon-sdk';
import { MezonClientConfig } from '../dtos/MezonClientConfig';

@Injectable()
export class MezonClientService {
  private readonly logger = new Logger(MezonClientService.name);
  private client: MezonClient;

  constructor(clientConfigs: MezonClientConfig) {
    this.client = new MezonClient(clientConfigs.token);
  }

  async initializeClient() {
    try {
      const result = await this.client.authenticate();
      this.logger.log('authenticated.', result);
    } catch (error) {
      this.logger.error('error authenticating.', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  async sendMessage(replyMessage) {
    return this.client.sendMessage(
      replyMessage.clan_id,
      '0',
      replyMessage.channel_id,
      replyMessage.mode,
      replyMessage.is_public,
      true,
      replyMessage.msg,
      replyMessage.mentions,
      replyMessage.attachments,
      replyMessage.ref,
    );
  }
}
