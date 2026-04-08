export interface AdminProfile {
  readonly username:  string;
  readonly email:     string;
  readonly role:      string;
  readonly phone:     string | null;
  readonly createdAt: string;
}

export interface ProfileUpdateData {
  readonly username?: string;
  readonly email?:    string;
  readonly phone?:    string | null;
}
