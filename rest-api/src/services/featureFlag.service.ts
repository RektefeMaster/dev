import crypto from 'crypto';
import NodeCache from 'node-cache';
import { FeatureFlag, IFeatureFlag, FeatureFlagScopeType } from '../models/FeatureFlag';
import { FeatureFlagKey } from '../config/featureFlags';

export interface FeatureFlagContext {
  env?: string;
  tenantId?: string;
  userId?: string;
  cohorts?: string[];
}

export interface EvaluatedFeatureFlag {
  key: string;
  enabled: boolean;
  matchedScope?: FeatureFlagScopeType;
  matchedTarget?: string;
  defaultOn: boolean;
}

const FLAG_CACHE_TTL_SECONDS = 60;

const flagCache = new NodeCache({
  stdTTL: FLAG_CACHE_TTL_SECONDS,
  checkperiod: FLAG_CACHE_TTL_SECONDS,
  useClones: false,
});

const cacheKey = (key: string) => `feature-flag:${key}`;

const hashToPercent = (seed: string) => {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const firstFour = hash.substring(0, 4);
  const numeric = parseInt(firstFour, 16);
  return (numeric % 10000) / 100;
};

const shouldApplyRollout = (rolloutPercent?: number, userHashSeed?: string): boolean => {
  if (rolloutPercent === undefined || rolloutPercent === null) {
    return true;
  }
  if (!userHashSeed) {
    return false;
  }
  const percent = hashToPercent(userHashSeed);
  return percent <= rolloutPercent;
};

const getCachedFlag = async (key: string): Promise<IFeatureFlag | null> => {
  const cached = flagCache.get<IFeatureFlag>(cacheKey(key));
  if (cached) {
    return cached;
  }
  const flag = await FeatureFlag.findOne({ key }).lean<IFeatureFlag>().exec();
  if (flag) {
    flagCache.set(cacheKey(key), flag);
  }
  return flag;
};

export class FeatureFlagService {
  static async getFlag(key: FeatureFlagKey | string, context: FeatureFlagContext = {}): Promise<EvaluatedFeatureFlag> {
    const flag = await getCachedFlag(key);
    if (!flag) {
      return {
        key,
        enabled: false,
        defaultOn: false,
      };
    }

    const { env, tenantId, userId, cohorts = [] } = context;

    const scopesByPriority: Array<{ type: FeatureFlagScopeType; value?: string }> = [
      userId ? { type: 'user', value: userId } : { type: 'user', value: undefined },
      tenantId ? { type: 'tenant', value: tenantId } : { type: 'tenant', value: undefined },
      cohorts.length ? { type: 'cohort', value: undefined } : { type: 'cohort', value: undefined },
      env ? { type: 'env', value: env } : { type: 'env', value: undefined },
    ];

    for (const { type } of scopesByPriority) {
      const scopeMatches = flag.scopes.filter((scope) => scope.type === type);
      if (!scopeMatches.length) {
        continue;
      }

      if (type === 'user' && userId) {
        const directMatch = scopeMatches.find((scope) => scope.target === userId);
        if (directMatch && shouldApplyRollout(directMatch.rolloutPercent, userId)) {
          return {
            key,
            enabled: directMatch.enabled,
            matchedScope: type,
            matchedTarget: directMatch.target,
            defaultOn: flag.defaultOn,
          };
        }
      }

      if (type === 'tenant' && tenantId) {
        const tenantMatch = scopeMatches.find((scope) => scope.target === tenantId);
        if (tenantMatch && shouldApplyRollout(tenantMatch.rolloutPercent, tenantId)) {
          return {
            key,
            enabled: tenantMatch.enabled,
            matchedScope: type,
            matchedTarget: tenantMatch.target,
            defaultOn: flag.defaultOn,
          };
        }
      }

      if (type === 'cohort' && cohorts.length) {
        for (const cohort of cohorts) {
          const cohortMatch = scopeMatches.find((scope) => scope.target === cohort);
          if (cohortMatch && shouldApplyRollout(cohortMatch.rolloutPercent, `${cohort}:${userId ?? tenantId ?? ''}`)) {
            return {
              key,
              enabled: cohortMatch.enabled,
              matchedScope: type,
              matchedTarget: cohortMatch.target,
              defaultOn: flag.defaultOn,
            };
          }
        }
      }

      if (type === 'env' && env) {
        const envMatch = scopeMatches.find((scope) => scope.target === env);
        if (envMatch && shouldApplyRollout(envMatch.rolloutPercent, env)) {
          return {
            key,
            enabled: envMatch.enabled,
            matchedScope: type,
            matchedTarget: envMatch.target,
            defaultOn: flag.defaultOn,
          };
        }
      }
    }

    return {
      key,
      enabled: flag.defaultOn,
      defaultOn: flag.defaultOn,
    };
  }

  static async primeFlag(key: string): Promise<void> {
    await getCachedFlag(key);
  }

  static async refreshFlag(key: string): Promise<void> {
    flagCache.del(cacheKey(key));
    await this.primeFlag(key);
  }

  static async clearCache(): Promise<void> {
    flagCache.flushAll();
  }
}


