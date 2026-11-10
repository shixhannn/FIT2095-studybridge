export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  role: 'learner' | 'tutor' | 'admin';
  createdDate: string;
  greeting: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: 'learner' | 'tutor';
}

export interface LoginPayload {
    email: string; 
    password: string; 
}