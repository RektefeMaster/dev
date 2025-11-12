import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  tenantId: string;
  userId?: mongoose.Types.ObjectId;
  userType?: string;
  event: string;
  properties?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
  requestId?: string;
  platform?: string;
  appVersion?: string;
  userAgent?: string;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userType: { type: String },
    event: { type: String, required: true, index: true },
    properties: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: () => new Date(), index: true },
    requestId: { type: String },
    platform: { type: String },
    appVersion: { type: String },
    userAgent: { type: String },
  },
  {
    collection: 'analytics_events',
  }
);

AnalyticsEventSchema.index({ tenantId: 1, event: 1, timestamp: -1 });
AnalyticsEventSchema.index({ tenantId: 1, createdAt: -1 });

export const AnalyticsEvent =
  mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
