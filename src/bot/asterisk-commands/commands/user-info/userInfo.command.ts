import { ChannelMessage } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from '../../abstracts/command.abstract';
import { ClientConfigService } from 'src/bot/config/client-config.service';
import { AxiosClientService } from 'src/bot/services/axiosClient.services';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/bot/models';
import { Repository } from 'typeorm';
import { EUserType } from 'src/bot/constants/configs';
import { EUserError } from 'src/bot/constants/error';
import moment from 'moment';

// TODO: canot get user data from MEZON
@Command('userinfo')
export class UserInfoCommand extends CommandMessage {
  constructor(
    private readonly clientConfigService: ClientConfigService,
    private readonly axiosClientService: AxiosClientService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    let userQuery = '';
    if (args.length) {
      userQuery = message.references.length
        ? message.references[0].message_sender_username
        : args[0];
    } else {
      userQuery = message.sender_id;
    }

    const findUser = await this.userRepository
      .createQueryBuilder()
      .where('email = :email', { email: userQuery })
      .orWhere('username = :username', { username: userQuery })
      .orWhere('"userId" = :userId', { userId: userQuery })
      .andWhere('user_type = :userType', { userType: EUserType.MEZON })
      .getOne();

    if (!findUser && args.length)
      return this.replyMessageGenerate(
        {
          messageContent: EUserError.INVALID_USER,
          mk: [{ type: 't', s: 0, e: EUserError.INVALID_USER.length }],
        },
        message,
      );

    const email = findUser?.email.toLowerCase() + '@ncc.asia';
    const { wiki, project, wikiApiKeySecret } = this.clientConfigService;
    const httpsAgent = this.clientConfigService.https;
    const headers = { 'X-Secret-Key': wikiApiKeySecret };

    const [userData, pmData] = await Promise.all([
      this.axiosClientService.get(`${wiki.api_url}${email}`, {
        httpsAgent,
        headers,
      }),
      this.axiosClientService.get(`${project.getPMOfUser}?email=${email}`, {
        httpsAgent,
      }),
    ]);

    const projectData = pmData?.data?.result?.[0];
    const projectInfo = project
      ? `${projectData.projectName} (${projectData.projectCode}) - PM ${projectData.pm?.fullName || 'Unknown'}`
      : '';

    const accountCreatedAt = moment(
      parseInt(findUser.createdAt.toString()),
    ).utcOffset(420);

    const phoneNumber =
      (userData as any)?.data?.result?.phoneNumber ?? '(no information)';

    const messageContent =
      '```' +
      `${findUser.username}\n` +
      `• Username: ${findUser.username}\n` +
      `• Id: ${findUser.userId}\n` +
      `• Account creation: ${accountCreatedAt.format('HH:mm DD-MM-YYYY')} (${accountCreatedAt.fromNow()})\n` +
      `• Phone: ${phoneNumber}\n` +
      `• Project: ${projectInfo}` +
      '```';

    return this.replyMessageGenerate(
      {
        messageContent,
        mk: [{ type: 't', s: 0, e: messageContent.length }],
        attachments: [
          {
            url: findUser.avatar + '',
            filetype: 'image/jpeg',
          },
        ],
      },
      message,
    );
  }
}
