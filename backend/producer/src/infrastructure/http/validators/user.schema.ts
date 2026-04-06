import Joi from 'joi';
import { VALID_IRMS_ROLES } from '../../../domain/value-objects/UserRole';


export const createUserSchema = Joi.object({
  email:    Joi.string().email().required().messages({
    'string.email': 'El correo electrónico tiene un formato inválido',
    'any.required': 'El correo electrónico es obligatorio',
  }),
  fullName: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'El nombre completo no puede estar vacío',
    'any.required': 'El nombre completo es obligatorio',
  }),
  role: Joi.string().valid(...VALID_IRMS_ROLES).required().messages({
    'any.only':    `Rol no válido. Roles permitidos: ${VALID_IRMS_ROLES.join(', ')}`,
    'any.required': 'El rol es obligatorio',
  }),
  username: Joi.string().min(3).max(255).required().messages({
    'any.required': 'El nombre de usuario es obligatorio',
  }),
});

export const updateUserSchema = Joi.object({
  fullName: Joi.string().min(1).max(255).optional().messages({
    'string.empty': 'El nombre completo no puede estar vacío',
  }),
  role: Joi.string().valid(...VALID_IRMS_ROLES).optional().messages({
    'any.only': `Rol no válido. Roles permitidos: ${VALID_IRMS_ROLES.join(', ')}`,
  }),
}).min(1).messages({
  'object.min': 'Debes proporcionar al menos un campo para actualizar (fullName o role)',
});

export const toggleStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages({
    'any.required': 'El campo isActive es obligatorio',
  }),
});
