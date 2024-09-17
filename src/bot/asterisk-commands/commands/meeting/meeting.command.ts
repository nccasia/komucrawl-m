import { ChannelMessage, ChannelType, MezonClient } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from '../../abstracts/command.abstract';
import { MeetingService } from './meeting.services';
import { MezonClientService } from 'src/mezon/services/client.service';
import { ClientConfigService } from 'src/bot/config/client-config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ChannelMezon } from 'src/bot/models';
import { Repository } from 'typeorm';
import { messHelp } from './meeting.constants';

// TODO: canot get user, channel data from MEZON
@Command('meeting')
export class MeetingCommand extends CommandMessage {
  private client: MezonClient;
  constructor(
    private meetingService: MeetingService,
    private clientService: MezonClientService,
    private clientConfigService: ClientConfigService,
    @InjectRepository(ChannelMezon)
    private channelRepository: Repository<ChannelMezon>,
  ) {
    super();
    this.client = this.clientService.getClient();
  }

  async execute(args: string[], message: ChannelMessage) {
    if (!args.length) {
      const messageContent =
        await this.meetingService.handleMeetingNoArgs(message);
      return this.replyMessageGenerate(
        { messageContent, mk: [{ type: 't', s: 0, e: messageContent.length }] },
        message,
      );
    }
    if (args[0] === 'now') {
      const listVoiceChannel = (await this.channelRepository.find()).filter(
        (item) => item.channel_type === ChannelType.CHANNEL_TYPE_VOICE,
      );

      const listChannelVoiceUsers = (
        await this.client.listChannelVoiceUsers(
          this.clientConfigService.clandNccId,
          '',
          ChannelType.CHANNEL_TYPE_VOICE,
        )
      ).voice_channel_users;

      const listVoiceChannelIdUsed = [];
      listChannelVoiceUsers.forEach((item) => {
        if (!listVoiceChannelIdUsed.includes(item.channel_id))
          listVoiceChannelIdUsed.push(item.channel_id);
      });
      const listVoiceChannelAvalable = listVoiceChannel.filter(
        (item) => !listVoiceChannelIdUsed.includes(item.channel_id),
      );

      const currentUserVoiceChannel = listChannelVoiceUsers.filter(
        (item) => item.participant === message.display_name,
      );

      if (currentUserVoiceChannel.length) {
        let messageContent =
          currentUserVoiceChannel.length > 1
            ? `${message.clan_nick || message.display_name || message.username} are in ${currentUserVoiceChannel.length} voice channels!\n`
            : '';
        const hg = currentUserVoiceChannel.map((item) => {
          messageContent += `Everyone please join the voice channel #\n`;
          return {
            channelid: item.channel_id,
            s: messageContent.length - 2,
            e: messageContent.length - 1,
          };
        });
        return this.replyMessageGenerate(
          {
            messageContent: messageContent,
            hg: hg,
          },
          message,
        );
      }

      if (!listVoiceChannelAvalable.length) {
        return this.replyMessageGenerate(
          {
            messageContent: 'Voice channel full!',
          },
          message,
        );
      }

      const randomIndexVoiceChannel = Math.floor(
        Math.random() * listVoiceChannelAvalable.length,
      );
      const messageContent = `Our meeting room is `;
      return this.replyMessageGenerate(
        {
          messageContent: messageContent + '#',
          hg: [
            {
              channelid:
                listVoiceChannelAvalable[randomIndexVoiceChannel].channel_id,
              s: messageContent.length,
              e: messageContent.length + 1,
            },
          ],
        },
        message,
      );
    }

    if (args[0] === 'cancel') {
      if (!args[1])
        return this.replyMessageGenerate(
          {
            messageContent: '```' + '*report help' + '```',
          },
          message,
        );
      const id = args[1];
      const findId = await this.meetingService.cancelMeetingById(id);

      return this.replyMessageGenerate(
        {
          messageContent: !findId ? 'Not found.' : '✅ Cancel successfully.',
        },
        message,
      );
    }

    const task = args[0];
    let datetime = args.slice(1, 3).join(' ');
    let repeat = args[3];
    let repeatTime = args.slice(4).join(' ');
    const checkDate = args[1];
    let checkTime = args[2];
    let timestamp;

    if (repeat === 'first' || repeat === 'last') {
      repeat = checkTime;
      repeatTime = args.slice(3).join(' ');
      checkTime = checkDate;

      if (
        !this.meetingService.validateTime(checkTime) ||
        repeat !== 'monthly'
      ) {
        return this.replyMessageGenerate(
          {
            messageContent: messHelp,
          },
          message,
        );
      } else {
        const currentDate = new Date();
        const [hours, minutes] = checkTime.split(':');
        currentDate.setHours(Number(hours), Number(minutes));
        timestamp = currentDate.getTime();
      }
    }

    if (repeatTime !== 'first' && repeatTime !== 'last') {
      if (
        !this.meetingService.validateRepeatTime(repeatTime) ||
        !this.meetingService.validateDate(checkDate) ||
        !this.meetingService.validateTime(checkTime)
      ) {
        return this.replyMessageGenerate(
          {
            messageContent: messHelp,
          },
          message,
        );
      } else {
        const day = datetime.slice(0, 2);
        const month = datetime.slice(3, 5);
        const year = datetime.slice(6);

        const format = `${month}/${day}/${year}`;
        const dateObject = new Date(format);
        timestamp = dateObject.getTime();
      }
    }

    if (!repeat) repeat = 'once';
    const allowedRepeats = ['once', 'daily', 'weekly', 'repeat', 'monthly'];
    if (!allowedRepeats.includes(repeat)) {
      return this.replyMessageGenerate(
        {
          messageContent: messHelp + '2222',
        },
        message,
      );
    }

    await this.meetingService.saveMeeting(
      message.channel_id,
      task,
      timestamp,
      repeat,
      repeatTime,
    );
    return this.replyMessageGenerate(
      {
        messageContent: '✅ Meeting saved.',
      },
      message,
    );
  }
}
