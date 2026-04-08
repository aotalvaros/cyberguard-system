import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email:    Joi.string().email().optional(),
  phone:    Joi.string().pattern(/^\+[1-9]\d{6,14}$/).optional().allow(null),
}).min(1).options({ abortEarly: false, stripUnknown: true });
