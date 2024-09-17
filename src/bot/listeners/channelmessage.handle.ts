import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Events,
  ChannelMessage,
  MezonClient,
  ChannelStreamMode,
} from 'mezon-sdk';
import { MezonClientService } from 'src/mezon/services/client.service';
import { ReplyMezonMessage } from '../asterisk-commands/dto/replyMessage.dto';
import { Asterisk } from '../asterisk-commands/asterisk';
import { Repository } from 'typeorm';
import { Channel, Mentioned, Msg, User } from '../models';
import { InjectRepository } from '@nestjs/typeorm';
import { checkTimeMention } from '../utils/helper';
import { BOT_ID } from '../constants/configs';
import { AxiosClientService } from '../services/axiosClient.services';
import { ApiUrl } from '../constants/api_url';
import { replyMessageGenerate } from '../utils/generateReplyMessage';
import { ClientConfigService } from '../config/client-config.service';

@Injectable()
export class EventListenerChannelMessage {
  private client: MezonClient;
  constructor(
    private clientService: MezonClientService,
    private asteriskCommand: Asterisk,
    @InjectRepository(Mentioned)
    private mentionedRepository: Repository<Mentioned>,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
    @InjectRepository(Msg) private msgRepository: Repository<Msg>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly axiosClientService: AxiosClientService,
    private clientConfigService: ClientConfigService,
  ) {}

  @OnEvent(Events.ChannelMessage)
  async handleMentioned(message: ChannelMessage) {
    try {
      if (
        // message.is_public ||
        message.sender_id === this.clientConfigService.botKomuId
      )
        return;
      await Promise.all([
        this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({ last_message_id: message.message_id })
          .where('"userId" = :userId', { userId: message.sender_id })
          .andWhere(`deactive IS NOT True`)
          .execute(),
        this.mentionedRepository
          .createQueryBuilder()
          .update(Mentioned)
          .set({ confirm: true, reactionTimestamp: Date.now() })
          .where(`"channelId" = :channelId`, { channelId: message.channel_id })
          .andWhere(`"mentionUserId" = :mentionUserId`, {
            mentionUserId: message.sender_id,
          })
          .andWhere(`"confirm" = :confirm`, { confirm: false })
          .andWhere(`"reactionTimestamp" IS NULL`)
          .execute(),
      ]);
      if (
        message.mode === 4 ||
        ('t' in message.content &&
          typeof message.content.t === 'string' &&
          message.content.t.split(' ').includes('@here'))
      )
        return;
      // const checkCategories: string[] = [
      //   'PROJECTS',
      //   'PROJECTS-EXT',
      //   'PRODUCTS',
      //   'LOREN',
      //   'HRM&IT',
      //   'SAODO',
      //   'MANAGEMENT',
      // ];

      const validCategory: boolean = true;
      // if (channel.name.slice(0, 4).toUpperCase() === 'PRJ-') {
      //   validCategory = true;
      // } else {
      //   validCategory = checkCategories.includes(channel.name.toUpperCase());
      // }
      // if (!checkTimeMention(new Date())) return;

      if (message.mentions && message.mentions.length && validCategory) {
        message.mentions.forEach(async (user) => {
          if (
            user?.user_id === this.clientConfigService.botKomuId ||
            user?.role_id
          )
            return;
          const data = {
            messageId: message.message_id,
            authorId: message.sender_id,
            channelId: message.channel_id,
            mentionUserId: user.user_id,
            createdTimestamp: new Date(message.create_time).getTime(),
            noti: false,
            confirm: false,
            punish: false,
            reactionTimestamp: null,
          };
          await this.mentionedRepository.insert(data);
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  @OnEvent(Events.ChannelMessage)
  async handleCommand(msg: ChannelMessage) {
    try {
      const content = msg.content.t;
      let replyMessage: ReplyMezonMessage;
      // const client = this.clientService.getClient();
      // if (msg.sender_id != BOT_ID) {
      //   client.sendMessageUser(
      //     msg.sender_id,
      //     `Bot rep lại tin nhắn ${content}`,
      //   );
      // }
      if (typeof content == 'string' && content.trim()) {
        const firstLetter = content.trim()[0];
        switch (firstLetter) {
          case '*':
            replyMessage = await this.asteriskCommand.execute(content, msg);
            break;
          default:
            return;
          // console.log(msg);
        }

        if (replyMessage) {
          const replyMessageArray = Array.isArray(replyMessage)
            ? replyMessage
            : [replyMessage];
          for (const mess of replyMessageArray) {
            await this.clientService.sendMessage(mess);
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  @OnEvent(Events.ChannelMessage)
  async handleAIforbot(msg: ChannelMessage) {
    try {
      const mentions = Array.isArray(msg.mentions) ? msg.mentions : [];
      const message = msg.content.t;
      const refs = Array.isArray(msg.references) ? msg.references : [];
      if (
        (msg.mode === ChannelStreamMode.STREAM_MODE_DM ||
          mentions?.some((obj) => obj.user_id === BOT_ID) ||
          refs?.some((obj) => obj.message_sender_id === BOT_ID)) &&
        typeof message == 'string' &&
        msg.sender_id !== BOT_ID
      ) {
        const url = ApiUrl.AIApi;
        let AIReplyMessage;
        AIReplyMessage = `Very busy, too much work today. I'm so tired. BRB.`;

        try {
          const response = await this.axiosClientService.post(
            url,
            {
              text: message,
            },
            { timeout: 5000 },
          );
          if (response.status == 200) {
            AIReplyMessage = response.data.Response;
          } else {
            throw Error('swtich AI API');
          }
        } catch (e) {
          const baseUrl = 'https://api.aimlapi.com/v1';
          const apiKey = process.env.FREE_API_KEY;
          const systemPrompt =
            'bạn là một công cụ ảo được hỗ trợ của công ty công nghệ có hơn 200 nhân viên tên là KOMU. hãy trả lời bằng tiếng việt nhé. Hiện tại trợ lý ảo của công ty đang ra ngoài có chút việc nên bạn sẽ giúp bạn ấy trả lời các câu hỏi khi bạn ấy vắng mặt';

          const headers = {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          };
          const response = await this.axiosClientService.post(
            `${baseUrl}/chat/completions`,
            {
              model: 'mistralai/Mistral-7B-Instruct-v0.2',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
            },
            { headers },
          );

          const completion = response.data;
          AIReplyMessage = completion.choices[0].message.content;
        }

        const replyMessage = replyMessageGenerate(
          { messageContent: AIReplyMessage, mentions: [] },
          msg,
        );

        await this.clientService.sendMessage(replyMessage);
      }
    } catch (e) {
      console.log(e);
    }
  }
}
