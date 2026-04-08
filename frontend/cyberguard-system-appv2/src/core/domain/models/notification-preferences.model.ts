export interface NotificationPreferences {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailEnabled: false,
  whatsappEnabled: false,
  email: '',
  phone: '',
};
