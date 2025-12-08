export interface LoginRequest {
  email: string;
  password: string;
  recaptchaToken?: string;
}
