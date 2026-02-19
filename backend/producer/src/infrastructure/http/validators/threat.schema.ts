import Joi from 'joi';

export const createThreatSchema = Joi.object({
  type: Joi.string()
    .valid('malware', 'intrusion', 'phishing', 'ddos', 'ransomware')
    .required()
    .messages({
      'any.only': 'type must be one of: malware, intrusion, phishing, ddos, ransomware',
      'any.required': 'type is required',
      'string.empty': 'type cannot be empty',
    }),

  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .required()
    .messages({
      'any.only': 'severity must be one of: low, medium, high, critical',
      'any.required': 'severity is required',
      'string.empty': 'severity cannot be empty',
    }),

  sourceIp: Joi.string()
    .ip({ version: ['ipv4', 'ipv6'] })
    .required()
    .messages({
      'string.ip': 'sourceIp must be a valid IPv4 or IPv6 address',
      'any.required': 'sourceIp is required',
      'string.empty': 'sourceIp cannot be empty',
    }),

  targetIp: Joi.string()
    .ip({ version: ['ipv4', 'ipv6'] })
    .optional()
    .messages({
      'string.ip': 'targetIp must be a valid IPv4 or IPv6 address',
    }),

  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'description must be at least 10 characters long',
      'string.max': 'description must not exceed 500 characters',
      'any.required': 'description is required',
      'string.empty': 'description cannot be empty',
    }),

  metadata: Joi.object()
    .optional()
    .messages({
      'object.base': 'metadata must be a valid object',
    }),
}).options({ abortEarly: false, stripUnknown: true });
