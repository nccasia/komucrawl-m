import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class WFHSchedulerService {
  private abc = 'sadsad';
  // @Interval(1000)
  handleInterval() {
    console.log('asd');
  }
}
