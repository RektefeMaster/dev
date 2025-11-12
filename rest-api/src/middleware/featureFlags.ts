import { NextFunction, Request, Response } from 'express';
import { FeatureFlagService, FeatureFlagContext, EvaluatedFeatureFlag } from '../services/featureFlag.service';

const FEATURE_FLAG_ENV = process.env.FEATURE_FLAG_ENV || process.env.NODE_ENV || 'development';

const parseCohorts = (headerValue?: string | string[]): string[] => {
  if (!headerValue) {
    return [];
  }
  if (Array.isArray(headerValue)) {
    return headerValue.flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean));
  }
  return headerValue
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

export const createFeatureFlagMiddleware =
  (flagKeys: string[] = []) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantIdFromHeader = (req.headers['x-tenant-id'] || req.headers['x-tenant']) as string | undefined;
      const userId = req.user?.userId;
      const cohorts = parseCohorts(req.headers['x-user-cohorts']);

      const context: FeatureFlagContext = {
        env: FEATURE_FLAG_ENV,
        tenantId: req.tenantId || tenantIdFromHeader,
        userId,
        cohorts,
      };

      if (!req.tenantId && tenantIdFromHeader) {
        req.tenantId = tenantIdFromHeader;
      }

      req.featureFlagContext = context;

      const evaluatedFlags: Record<string, EvaluatedFeatureFlag> = {};

      for (const key of flagKeys) {
        const flag = await FeatureFlagService.getFlag(key, context);
        evaluatedFlags[key] = flag;
      }

      req.featureFlags = {
        ...(req.featureFlags || {}),
        ...evaluatedFlags,
      };

      if (Object.keys(evaluatedFlags).length > 0) {
        const serialized = Object.entries(evaluatedFlags)
          .map(([key, value]) => `${key}:${value.enabled ? 'on' : 'off'}${value.matchedScope ? `(${value.matchedScope})` : ''}`)
          .join(',');
        res.setHeader('X-Feature-Flags', serialized);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

