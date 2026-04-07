import Joi from 'joi';

/**
 * Schema Joi para actualizar perfil del administrador.
 *
 * HUMAN CHECK: el campo `role` está explícitamente ausente de este schema.
 * Cualquier intento de incluirlo en el body será rechazado por stripUnknown.
 * La validación de runtime en UpdateAdminProfileUseCase es la segunda capa de defensa.
 */
export const updateProfileSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email:    Joi.string().email().optional(),
  phone:    Joi.string().pattern(/^\+[1-9]\d{6,14}$/).optional().allow(null),
}).min(1).options({ abortEarly: false, stripUnknown: true });
