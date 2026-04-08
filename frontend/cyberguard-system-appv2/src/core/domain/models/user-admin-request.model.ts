export interface CreateUserAdminRequest {
  email:    string;
  fullName: string;
  role:     string;
  username: string;
}

export interface UpdateUserAdminRequest {
  fullName?: string;
  role?:     string;
}

export interface ToggleUserStatusRequest {
  isActive: boolean;
}
