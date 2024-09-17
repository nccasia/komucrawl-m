import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from '../../abstracts/command.abstract';
import { ChannelMessage } from 'mezon-sdk';
import { messHelpDaily } from './report.constants';
import { ReportDailyService } from './reportDaily.service';

@Command('report')
export class ReportCommand extends CommandMessage {
  constructor(private reportDailyService: ReportDailyService) {
    super();
  }

  async execute(args: string[], message: ChannelMessage) {
    const firstArg = args[0];

    switch (firstArg) {
      case 'daily':
        if (args[1]) {
          const day = args[1].slice(0, 2);
          const month = args[1].slice(3, 5);
          const year = args[1].slice(6);
          const fomat = `${month}/${day}/${year}`;
          const dateTime = new Date(fomat);
          if (
            !/^(((0[1-9]|[12]\d|3[01])\/(0[13578]|1[02])\/((19|[2-9]\d)\d{2}))|((0[1-9]|[12]\d|30)\/(0[13456789]|1[012])\/((19|[2-9]\d)\d{2}))|((0[1-9]|1\d|2[0-8])\/02\/((19|[2-9]\d)\d{2}))|(29\/02\/((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|(([1][26]|[2468][048]|[3579][26])00))))$/.test(
              args[1],
            )
          ) {
            return this.replyMessageGenerate(
              {
                messageContent: messHelpDaily,
                mk: [{ type: 't', s: 0, e: messHelpDaily.length }],
              },
              message,
            );
          }
          const mess = await this.reportDailyService.reportDaily(dateTime);
          if (mess) {
            return mess.map((m) => {
              return this.replyMessageGenerate(
                {
                  messageContent: '```' + m + '```',
                  mk: [{ type: 't', s: 0, e: m.length + 6 }],
                },
                message,
              );
            });
          }
        } else {
          const mess = await this.reportDailyService.reportDaily(null);
          if (mess) {
            return mess.map((m) => {
              return this.replyMessageGenerate(
                {
                  messageContent: '```' + m + '```',
                  mk: [{ type: 't', s: 0, e: m.length + 6 }],
                },
                message,
              );
            });
          }
        }
        break;
      default:
        break;
    }
  }
}
