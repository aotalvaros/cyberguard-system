
export interface UserAdminItem {
  readonly id:        string;
  readonly uid:       string;
  readonly username:  string;
  readonly email:     string;
  readonly fullName:  string | null;
  readonly role:      string;
  readonly isActive:  boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UserAdminList {
  readonly users: UserAdminItem[];
  readonly total: number;
}
