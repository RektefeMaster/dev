import mongoose, { Schema, Document } from 'mongoose';

export type FeatureFlagScopeType = 'env' | 'tenant' | 'user' | 'cohort';

export interface IFeatureFlagScope {
  type: FeatureFlagScopeType;
  target: string;
  enabled: boolean;
  rolloutPercent?: number;
}

export interface IFeatureFlag extends Document {
  key: string;
  defaultOn: boolean;
  description?: string;
  scopes: IFeatureFlagScope[];
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureFlagScopeSchema = new Schema<IFeatureFlagScope>(
  {
    type: {
      type: String,
      required: true,
      enum: ['env', 'tenant', 'user', 'cohort'],
    },
    target: { type: String, required: true },
    enabled: { type: Boolean, required: true },
    rolloutPercent: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
    },
  },
  { _id: false }
);

const FeatureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: { type: String, required: true, unique: true },
    defaultOn: { type: Boolean, required: true, default: false },
    description: { type: String, required: false },
    scopes: { type: [FeatureFlagScopeSchema], required: true, default: [] },
    tags: { type: [String], required: false },
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  {
    collection: 'feature_flag',
    timestamps: true,
  }
);

FeatureFlagSchema.index({ key: 1 }, { unique: true });
FeatureFlagSchema.index({ 'scopes.type': 1, 'scopes.target': 1 });

export const FeatureFlag: mongoose.Model<IFeatureFlag> =
  (mongoose.models.FeatureFlag as mongoose.Model<IFeatureFlag>) ||
  mongoose.model<IFeatureFlag>('FeatureFlag', FeatureFlagSchema);


