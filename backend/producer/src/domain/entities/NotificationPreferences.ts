export interface NotificationPreferences {
  username: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}

export const DEFAULT_PREFERENCES = (username: string): NotificationPreferences => ({
  username,
  emailEnabled: false,
  whatsappEnabled: false,
  email: '',
  phone: '',
});
