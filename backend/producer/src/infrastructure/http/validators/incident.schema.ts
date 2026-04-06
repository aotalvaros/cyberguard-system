import Joi from 'joi';

export const createIncidentSchema = Joi.object({
  threatId: Joi.string().uuid().required().messages({
    'string.base':   'threatId must be a string',
    'string.guid':   'threatId must be a valid UUID',
    'any.required':  'threatId is required',
  }),
});
