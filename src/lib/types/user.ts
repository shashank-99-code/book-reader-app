export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  // Additional fields if needed
}

export interface AuthUser {
  id: string;
  email: string;
  // Add other fields as needed
} 