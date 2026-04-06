export enum UserRole {
  ADMIN            = 'admin',
  SOC_ANALYST      = 'soc_analyst',
  INCIDENT_HANDLER = 'incident_handler',
  INCIDENT_MANAGER = 'incident_manager',
  CISO             = 'ciso',
}

export const VALID_IRMS_ROLES: string[] = Object.values(UserRole);

export function isValidRole(role: string): role is UserRole {
  return VALID_IRMS_ROLES.includes(role);
}
