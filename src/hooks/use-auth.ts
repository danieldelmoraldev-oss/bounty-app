// Auth Híbrido: Guardamos el Token Global (Usuario) y los datos de la Sala actual (Miembro)

const TOKEN_KEY = "bounty_auth_token";
const USER_ID_KEY = "bounty_user_id";

// Mantenemos los antiguos para saber en qué sala de la liga estamos
const MEMBER_ID_KEY = "bounty_member_id";
const GROUP_CODE_KEY = "bounty_group_code";
const MEMBER_NAME_KEY = "bounty_member_name";
const MEMBER_AVATAR_KEY = "bounty_member_avatar";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function getStoredMemberId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MEMBER_ID_KEY);
}

export function getStoredGroupCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GROUP_CODE_KEY);
}

export function getStoredMemberName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MEMBER_NAME_KEY);
}

export function getStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MEMBER_AVATAR_KEY);
}

// NUEVO: Guardar el pase VIP global
export function setGlobalAuth(token: string, userId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
}

// Guardar los datos de la sala en concreto
export function setAuth(memberId: string, groupCode: string, name: string, avatar?: string) {
  localStorage.setItem(MEMBER_ID_KEY, memberId);
  localStorage.setItem(GROUP_CODE_KEY, groupCode);
  localStorage.setItem(MEMBER_NAME_KEY, name);
  if (avatar) localStorage.setItem(MEMBER_AVATAR_KEY, avatar);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(MEMBER_ID_KEY);
  localStorage.removeItem(GROUP_CODE_KEY);
  localStorage.removeItem(MEMBER_NAME_KEY);
  localStorage.removeItem(MEMBER_AVATAR_KEY);
}

// Ahora estar autenticado significa tener una cuenta (Token)
export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

// Nueva función para saber si ya estás dentro de una sala
export function isInGroup(): boolean {
  return !!getStoredMemberId() && !!getStoredGroupCode();
}