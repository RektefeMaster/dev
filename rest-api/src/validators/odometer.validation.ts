import Joi from 'joi';
import {
  ODOMETER_EVENT_EVIDENCE,
  ODOMETER_EVENT_SOURCE,
  ODOMETER_UNIT,
} from '../models/OdometerEvent';

export const createOdometerEventSchema = Joi.object({
  km: Joi.number().integer().min(0).required(),
  unit: Joi.string()
    .valid(...ODOMETER_UNIT)
    .optional(),
  timestampUtc: Joi.date().iso().required(),
  source: Joi.string()
    .valid(...ODOMETER_EVENT_SOURCE)
    .required(),
  evidenceType: Joi.string()
    .valid(...ODOMETER_EVENT_EVIDENCE)
    .required(),
  evidenceUrl: Joi.string().uri().max(2048).optional(),
  notes: Joi.string().max(2000).allow('', null),
  odometerReset: Joi.boolean().optional(),
  clientRequestId: Joi.string().max(128).optional(),
  metadata: Joi.object().unknown(true).optional(),
});

export const timelineQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  cursor: Joi.string().base64().optional(),
  source: Joi.string()
    .valid(...ODOMETER_EVENT_SOURCE)
    .optional(),
  evidenceType: Joi.string()
    .valid(...ODOMETER_EVENT_EVIDENCE)
    .optional(),
});

export const auditQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  action: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

