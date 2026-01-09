export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "INSTRUCTOR"
  | "ASSISTANT"
  | "STUDENT"
  | "GUEST";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
