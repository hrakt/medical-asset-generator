import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

type AuthUser = {
  id: number;
  email: string;
  tenantId: number;
};

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token') || '');
  const user = ref<AuthUser | null>(loadStoredUser());

  const isAuthenticated = computed(() => Boolean(token.value));

  function setAuth(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken;
    user.value = nextUser;
    localStorage.setItem('auth_token', nextToken);
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
  }

  function clearAuth() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    clearAuth
  };
});
