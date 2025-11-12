import { Request } from 'express';
import { UserType } from '../../../shared/types/enums';
import { EvaluatedFeatureFlag } from '../services/featureFlag.service';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: UserType;
        name?: string;
        email?: string;
      };
      tenantId?: string;
      featureFlags?: Record<string, EvaluatedFeatureFlag>;
      featureFlagContext?: {
        env?: string;
        tenantId?: string;
        userId?: string;
        cohorts?: string[];
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: UserType;
    name?: string;
    email?: string;
  };
  tenantId?: string;
  featureFlags?: Record<string, EvaluatedFeatureFlag>;
  featureFlagContext?: {
    env?: string;
    tenantId?: string;
    userId?: string;
    cohorts?: string[];
  };
}
