import { ChannelMessage } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from '../../abstracts/command.abstract';
import { UserStatusService } from '../user-status/userStatus.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/bot/models';
import { Repository } from 'typeorm';
import { EUserType } from 'src/bot/constants/configs';
import { EUserError } from 'src/bot/constants/error';

@Command('avatar')
export class AvatarCommand extends CommandMessage {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    let messageContent: string;
    let queryUser: string;

    if (args.length) {
      queryUser = message.references.length
        ? message.references[0].message_sender_username
        : args[0];
    } else {
      queryUser = message.sender_id;
    }

    const findUser = await this.userRepository.findOne({
      where: args.length
        ? { username: queryUser, user_type: EUserType.MEZON }
        : { userId: queryUser, user_type: EUserType.MEZON },
    });

    if (!findUser && args.length)
      return this.replyMessageGenerate(
        {
          messageContent: EUserError.INVALID_USER,
          mk: [{ type: 't', s: 0, e: EUserError.INVALID_USER.length }],
        },
        message,
      );
    messageContent = findUser.avatar + '';
    return this.replyMessageGenerate(
      {
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
