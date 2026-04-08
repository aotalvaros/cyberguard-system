import Joi from 'joi';

export const saveNotifPreferencesSchema = Joi.object({
  emailEnabled: Joi.boolean().required(),
  whatsappEnabled: Joi.boolean().required(),
  email: Joi.when('emailEnabled', {
    is: true,
    then: Joi.string().email().required().messages({
      'string.empty': 'Email requerido cuando la notificación por email está activa',
      'string.email': 'Formato de email inválido',
      'any.required': 'Email requerido cuando la notificación por email está activa',
    }),
    otherwise: Joi.string().allow('').default(''),
  }),
  phone: Joi.when('whatsappEnabled', {
    is: true,
    then: Joi.string().pattern(/^\+[1-9]\d{9,14}$/).required().messages({
      'string.pattern.base': 'Número de teléfono debe tener formato E.164 (ej: +573001234567)',
      'string.empty': 'Teléfono requerido cuando WhatsApp está activo',
      'any.required': 'Teléfono requerido cuando WhatsApp está activo',
    }),
    otherwise: Joi.string().allow('').default(''),
  }),
}).options({ abortEarly: false, stripUnknown: true });
