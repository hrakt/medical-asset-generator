<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const status = ref<'idle' | 'submitting' | 'failed'>('idle');
const errorMessage = ref<string | null>(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

if (auth.isAuthenticated) {
  router.replace('/');
}

async function submitLogin() {
  status.value = 'submitting';
  errorMessage.value = null;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || 'Login failed');
    }

    const data = await res.json();
    auth.setAuth(data.token, data.user);
    router.replace('/');
  } catch (err: any) {
    status.value = 'failed';
    errorMessage.value = err.message || 'Login failed';
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md px-6 pb-6 pt-5 bg-slate-900/80 rounded-xl shadow-lg border border-slate-800">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold">Sign in</h1>
        <p class="text-slate-400 text-sm mt-1">Access your tenant workspace.</p>
      </div>

      <form @submit.prevent="submitLogin" class="space-y-4">
        <div>
          <label class="block text-sm mb-2 text-slate-400">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@clinic.com"
            class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-slate-400">Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          :disabled="status === 'submitting'"
          class="w-full mt-2 rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ status === 'submitting' ? 'Signing in...' : 'Sign in' }}
        </button>

        <p v-if="status === 'failed'" class="text-red-400 text-sm mt-2">Error: {{ errorMessage }}</p>
      </form>
    </div>
  </main>
</template>
