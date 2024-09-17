import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiMessageReaction, ChannelType, Events } from 'mezon-sdk';
import { Mentioned } from '../models';
import { Repository } from 'typeorm';
import { BaseHandleEvent } from './base.handle';
import { MezonClientService } from 'src/mezon/services/client.service';
import { ApiCreateChannelDescRequest } from 'mezon-sdk/dist/cjs/interfaces/client';
import { BOT_ID } from '../constants/configs';

@Injectable()
export class EventListenerMessageReaction extends BaseHandleEvent {
  constructor(
    clientService: MezonClientService,
    @InjectRepository(Mentioned)
    private mentionedRepository: Repository<Mentioned>,
  ) {
    super(clientService);
  }

  @OnEvent(Events.MessageReaction)
  async handleReactMessageMention(messageReaction: ApiMessageReaction) {
    // try {
    //   const { message, emoji } = messageReaction;
    //   const chid = message.channel.id;
    //   const messageId = message.id;
    //   const guildId = message.guildId;
    //   const createdTimestamp = message.createdTimestamp;
    //   let channel = message.channel;

    //   if (!message.guildId) return;

    //   const fetchMessage = await message.client.channels.fetch(
    //     message.channelId,
    //   );

    //   const msg = await (fetchMessage as any).messages.fetch(message.id);
    //   // if ((channel as any).type !== ChannelType.GuildCategory) {
    //   //   (channel as any) = await message.client.channels.fetch(
    //   //     (channel as any).parentId
    //   //   );
    //   // }

    //   if (
    //     channel.type === ChannelType.GuildPublicThread ||
    //     channel.type === ChannelType.GuildPrivateThread
    //   ) {
    //     const channelParent = await message.client.channels.fetch(
    //       channel.parentId,
    //     );
    //     channel = (await message.client.channels.fetch(
    //       (channelParent as any).parentId,
    //     )) as any;
    //   } else if (channel.type === ChannelType.GuildText) {
    //     channel = (await message.client.channels.fetch(
    //       channel.parentId,
    //     )) as any;
    //   }

    //   const checkCategories = [
    //     'PROJECTS',
    //     'PROJECTS-EXT',
    //     'PRODUCTS',
    //     'LOREN',
    //     'HRM&IT',
    //     'SAODO',
    //     'MANAGEMENT',
    //   ];

    //   let validCategory;
    //   if ((channel as any).name.slice(0, 4).toUpperCase() === 'PRJ-') {
    //     validCategory = true;
    //   } else {
    //     validCategory = checkCategories.includes(
    //       (channel as any).name.toUpperCase(),
    //     );
    //   }

    //   if (
    //     validCategory &&
    //     message.channelId !== '921339190090797106' &&
    //     msg.author.id != '922003239887581205'
    //   ) {
    //     const userDiscord = await message.client.users.fetch(msg.author.id);
    //     userDiscord
    //       .send(
    //         `${user.username} react ${emoji.name} on your comment ${message.url}`,
    //       )
    //       .catch((err) => console.log(err));
    //   }

    //   const resolveMention = message.mentions.users.find(
    //     (current) => current.id === user.id,
    //   );

    //   if (resolveMention) {

    // this.client.sendMessage()
    const data: ApiCreateChannelDescRequest = {
      clan_id: '0',
      channel_id: '0',
      category_id: '0',
      type: ChannelType.CHANNEL_TYPE_DM,
      user_ids: [messageReaction.sender_id, BOT_ID],
    };
    try {
      const result = await this.client.createChannelDesc(data);
    } catch (e) {
      console.log(e);
    }

    await this.mentionedRepository
      .createQueryBuilder()
      .update(Mentioned)
      .set({ confirm: true, reactionTimestamp: Date.now() })
      .where(`"messageId" = :messageId`, {
        messageId: messageReaction.message_id,
      })
      .andWhere(`"mentionUserId" = :mentionUserId`, {
        mentionUserId: messageReaction.sender_id,
      })
      .andWhere(`"reactionTimestamp" IS NULL`)
      .execute();

    //   }

    // const dataBwl = await this.bwlReactionRepository.findOne({
    //   relations: ["bwl", "author", "channel"],
    //   where: {
    //     guildId: guildId,
    //     // bwl: messageId,
    //     bwl: {
    //       messageId: messageId,
    //     },
    //     author: {
    //       userId: user.id,
    //     },
    //     channel: { id: chid },
    //   },
    // });

    // if (dataBwl != null) {
    //   await this.bwlReactionRepository
    //     .createQueryBuilder()
    //     .update(BwlReaction)
    //     .set({ count: dataBwl.count + 1 })
    //     .where("id = :id", { id: dataBwl.id })
    //     .execute();
    //   return;
    // }

    //   const bwl = await this.bwlRepository.findOne({
    //     where: {
    //       messageId: messageId,
    //     },
    //   });
    //   const userInsert = await this.userRepository.findOne({
    //     where: {
    //       userId: user.id,
    //     },
    //   });
    //   const channelInsert = await this.channelRepository.findOne({
    //     where: {
    //       id: chid,
    //     },
    //   });

    //   await this.bwlReactionRepository.insert({
    //     channel: channelInsert,
    //     guildId: guildId,
    //     bwl: bwl,
    //     author: userInsert,
    //     emoji: emoji.name,
    //     count: 1,
    //     createdTimestamp: createdTimestamp,
    //   });
    // } catch (error) {}
  }
}
