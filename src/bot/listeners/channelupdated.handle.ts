import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { ChannelUpdatedEvent, Events } from 'mezon-sdk';
import { Repository } from 'typeorm';
import { BaseHandleEvent } from './base.handle';
import { MezonClientService } from 'src/mezon/services/client.service';
import { ChannelMezon } from '../models/mezonChannel.entity';

@Injectable()
export class EventListenerChannelUpdated extends BaseHandleEvent {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(ChannelMezon)
    private channelRepository: Repository<ChannelMezon>,
  ) {
    super(clientService);
  }

  @OnEvent(Events.ChannelUpdated)
  async handleChannelUpdated(channelInput: ChannelUpdatedEvent) {
    const channelId = channelInput.channel_id;
    // Find the channel by channel_id
    const channel = await this.channelRepository.findOne({
      where: { channel_id: channelId },
    });
    if (!channel) {
      throw new NotFoundException(`Not found channal id ${channelId}`);
    }
    //TODO handle channel_private
    const { channel_label, category_id } = channelInput;
    const channelDb = this.channelRepository.merge(channel, {
      channel_label,
      category_id,
    });

    // Save the updated channel back to the database
    return this.channelRepository.save(channelDb);
  }
}
