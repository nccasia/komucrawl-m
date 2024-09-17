import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mentioned } from 'src/bot/models/mentioned.entity';
import moment from 'moment';
import { WorkFromHome } from 'src/bot/models/wfh.entity';
import { User } from 'src/bot/models/user.entity';
import { ClientConfigService } from 'src/bot/config/client-config.service';
import { UtilsService } from 'src/bot/services/utils.services';
import { MezonClientService } from 'src/mezon/services/client.service';
import { MezonClient } from 'mezon-sdk';
import { EMessageMode } from '../constants/configs';

@Injectable()
export class MentionSchedulerService {
  private client: MezonClient;
  constructor(
    private utilsService: UtilsService,
    @InjectRepository(Mentioned)
    private mentionRepository: Repository<Mentioned>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(WorkFromHome)
    private wfhRepository: Repository<WorkFromHome>,
    private schedulerRegistry: SchedulerRegistry,
    private clientConfig: ClientConfigService,
    private clientService: MezonClientService,
  ) {
    this.client = this.clientService.getClient();
  }

  private readonly logger = new Logger(MentionSchedulerService.name);

  addCronJob(name: string, time: string, callback: () => void): void {
    const job = new CronJob(
      time,
      () => {
        this.logger.warn(`time (${time}) for job ${name} to run!`);
        callback();
      },
      null,
      true,
      'Asia/Ho_Chi_Minh',
    );

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.warn(`job ${name} added for each minute at ${time} seconds!`);
  }

  // Start cron job
  startCronJobs(): void {
    this.addCronJob('checkMention', '*/1 9-11,13-17 * * 1-5', () =>
      this.checkMention(),
    );
  }

  async notifyUser(client, user) {
    const mentionChannel = await client.channels.fetch(user.channelId);
    if (!mentionChannel) {
      return;
    }
    const threadNoti = true;
    const message = await mentionChannel.messages.fetch(user.messageId);
    const mentionName = await client.users.fetch(user.authorId);
    const userDiscord = await client.users.fetch(user.mentionUserId);

    userDiscord
      .send(
        `Hãy trả lời ${mentionName.username} tại ${
          threadNoti ? 'thread' : 'channel'
        } ${message.url} nhé!`,
      )
      .catch(console.error);

    await this.mentionRepository.update({ id: user.id }, { noti: true });
  }

  async processNotiUsers(client, mentionedUsers) {
    const millisecondsOfTwentyfiveMinutes = 1500000;
    const millisecondsOfThirtyMinutes = 1800000;
    const dateNow = Date.now();

    // TODO: send message to user
    // const notiUser = mentionedUsers.filter(
    //   (item) =>
    //     dateNow - item.createdTimestamp >= millisecondsOfTwentyfiveMinutes &&
    //     dateNow - item.createdTimestamp < millisecondsOfThirtyMinutes &&
    //     !item.noti
    // );

    // await Promise.all(
    //   notiUser.map(async (user) => {
    //     await this.notifyUser(client, user);
    //   })
    // );

    const filteredMentionedUsers = mentionedUsers.filter(
      (item) => dateNow - item.createdTimestamp >= millisecondsOfThirtyMinutes,
    );

    return filteredMentionedUsers;
  }

  async createWFHWarning(client, user, mentionChannel, thread, channelName) {
    const findUser = await this.userRepository.findOne({
      where: { userId: user.mentionUserId },
    });
    const userName =
      findUser.clan_nick || findUser.display_name || findUser.username;
    const findAuthor = await this.userRepository.findOne({
      where: { userId: user.authorId },
    });
    const authorName =
      findAuthor.clan_nick || findAuthor.display_name || findAuthor.username;
    let content;
    thread
      ? (content = `${userName} không trả lời tin nhắn mention của ${authorName}
          lúc ${moment(parseInt(user.createdTimestamp.toString()))
            .utcOffset(420)
            .format('YYYY-MM-DD HH:mm:ss')} tại thread ${channelName} (${
            user.channelId
          })!\n`)
      : (content = `${userName} không trả lời tin nhắn mention của ${authorName}
          lúc ${moment(parseInt(user.createdTimestamp.toString()))
            .utcOffset(420)
            .format('YYYY-MM-DD HH:mm:ss')} tại channel ${user.channelId}!\n`);

    const data = await this.wfhRepository.save({
      user: findUser,
      wfhMsg: content,
      complain: false,
      pmconfirm: false,
      status: 'ACTIVE',
      type: 'mention',
      createdAt: Date.now(),
    });

    // send message to channel machleo
    await this.client.sendMessage(
      this.clientConfig.clandNccId,
      '0',
      this.clientConfig.machleoChannelId,
      EMessageMode.CHANNEL_MESSAGE,
      true,
      true,
      { t: content },
      [
        { user_id: user.mentionUserId, s: 0, e: userName.length },
        {
          user_id: user.authorId,
          s: userName.length + 36,
          e: userName.length + 36 + authorName.length,
        },
      ],
      undefined,
      undefined,
    );

    // update user punish
    await this.mentionRepository
      .createQueryBuilder()
      .update(Mentioned)
      .set({ confirm: true, punish: true })
      .where(`"mentionUserId" = :mentionUserId`, {
        mentionUserId: findUser.userId,
      })
      .execute();
  }

  async processMentionedUsers(client, mentionedUsers) {
    await Promise.all(
      mentionedUsers.map(async (user) => {
        let thread = false;
        // let mentionChannel = await client.channels
        //   .fetch(user.channelId)
        //   .catch((err) => {});

        // if (!mentionChannel) return;

        const channelName = 'unknown';
        // if (mentionChannel.type !== ChannelType.GuildText) {
        //   thread = true;
        //   mentionChannel = await client.channels
        //     .fetch(mentionChannel.parentId)
        //     .catch((err) => {});
        // }

        await this.createWFHWarning(
          client,
          user,
          undefined,
          thread,
          channelName,
        );
      }),
    );
  }

  async checkMention(client?) {
    if (await this.utilsService.checkHoliday()) return;
    if (this.utilsService.checkTime(new Date())) return;
    try {
      let mentionedUsers = await this.mentionRepository.find({
        where: { confirm: false },
      });

      const filteredMentionedUsers = await this.processNotiUsers(
        client,
        mentionedUsers,
      );

      await this.processMentionedUsers(client, filteredMentionedUsers);
    } catch (error) {
      console.log(error);
    }
  }
}
