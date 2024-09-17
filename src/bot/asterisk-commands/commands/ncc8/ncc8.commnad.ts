import { ChannelMessage, MezonClient } from 'mezon-sdk';
import { Command } from 'src/bot/base/commandRegister.decorator';
import { CommandMessage } from '../../abstracts/command.abstract';
import { ClientConfigService } from 'src/bot/config/client-config.service';
import { AxiosClientService } from 'src/bot/services/axiosClient.services';
import { MezonClientService } from 'src/mezon/services/client.service';

@Command('ncc8')
export class Ncc8Command extends CommandMessage {
  private client: MezonClient;
  constructor(
    private clientConfigService: ClientConfigService,
    private axiosClientService: AxiosClientService,
    private clientService: MezonClientService,
  ) {
    super();
    this.client = this.clientService.getClient();
  }

  async execute(args: string[], message: ChannelMessage) {
    const messageContent =
      '```' +
      'Command: *ncc8 play ID' +
      '\n' +
      'Example: *ncc8 play 180' +
      '```';
    if (args[0] === 'play') {
      if (!args[1])
        return this.replyMessageGenerate(
          {
            messageContent: messageContent,
            mk: [{ type: 't', s: 0, e: messageContent.length }],
          },
          message,
        );

      const textContent = `Go to `;
      try {
        const res = await this.axiosClientService.get(
          `http://172.16.100.114:3000/ncc8/episode/${args[1]}`,
        );

        // call api in sdk
        // const data = await this.client.registerStreamingChannel({
        //   clan_id: message.clan_id,
        //   channel_id: this.clientConfigService.ncc8ChannelId,
        // });

        // const res = await this.axiosClientService.get(
        //   'https://dev-mezon.nccsoft.vn:7305/v2/streaming-channels'
        // );

        // console.log(
        //   'data',
        //   message.clan_id,
        //   this.clientConfigService.ncc8ChannelId,
        //   data,
        // );

        if (!res) return;

        return this.replyMessageGenerate(
          {
            messageContent: textContent + `# ${res?.data?.url}` ?? '',
            hg: [
              {
                channelid: this.clientConfigService.ncc8ChannelId,
                s: textContent.length,
                e: textContent.length + 1,
              },
            ],
          },
          message,
        );
      } catch (error) {
        console.log(
          'error',
          message.clan_id,
          this.clientConfigService.ncc8ChannelId,
          error,
        );
        return this.replyMessageGenerate(
          {
            messageContent: 'Ncc8 not found',
          },
          message,
        );
      }
    }
    return this.replyMessageGenerate(
      {
        messageContent: messageContent,
        mk: [{ type: 't', s: 0, e: messageContent.length }],
      },
      message,
    );
  }
}
