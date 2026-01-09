import type { Role, User } from "./types";

const AUTH_KEY = "lms_auth_user";

// Demo kullanıcılar
export const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: "u1",
    name: "Super Admin",
    email: "super@lms.com",
    role: "SUPER_ADMIN",
    password: "abc123",
  },
  {
    id: "u2",
    name: "Admin",
    email: "admin@lms.com",
    role: "ADMIN",
    password: "abc123",
  },
  {
    id: "u3",
    name: "Eğitmen",
    email: "teacher@lms.com",
    role: "INSTRUCTOR",
    password: "abc123",
  },
  {
    id: "u4",
    name: "Öğrenci",
    email: "student@lms.com",
    role: "STUDENT",
    password: "abc123",
  },
];

// (eski) direkt login: localStorage'a yazar
export function login(email: string, password: string): User | null {
  const found = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!found) return null;

  const { password: _pw, ...user } = found;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
  return user;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("auth-changed"));
}

export function getUser(): User | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setRole(role: Role) {
  const u = getUser();
  if (!u) return;
  const next = { ...u, role };
  localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("auth-changed"));
}

export function isLoggedIn(): boolean {
  return !!getUser();
}

// 2FA için: sadece kullanıcıyı doğrula (localStorage'a yazmadan)
export function verifyCredentials(email: string, password: string): User | null {
  const found = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!found) return null;

  const { password: _pw, ...user } = found;
  return user;
}

// 2FA doğrulandıktan sonra user'ı localStorage'a yaz
export function persistUser(user: User) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
}
