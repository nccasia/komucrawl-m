import { Injectable } from '@nestjs/common';

@Injectable()
export class AIUserAccessCacheService {
  private readonly restrictedUserIds = new Set<string>();
  private readonly allowedUserIds = new Set<string>();

  getRestrictionStatus(userId: string): boolean | undefined {
    if (this.restrictedUserIds.has(userId)) return true;
    if (this.allowedUserIds.has(userId)) return false;
    return undefined;
  }

  setRestrictionStatus(userId: string, isRestricted: boolean) {
    if (isRestricted) {
      this.allowedUserIds.delete(userId);
      this.restrictedUserIds.add(userId);
      return;
    }

    this.restrictedUserIds.delete(userId);
    this.allowedUserIds.add(userId);
  }
}
