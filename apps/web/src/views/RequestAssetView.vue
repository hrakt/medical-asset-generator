<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

interface RequestForm {
  doctorName: string;
  practiceName: string;
  practiceType: string;
  channel: string;
  primaryMessage: string;
}

const form = ref<RequestForm>({
  doctorName: '',
  practiceName: '',
  practiceType: 'Dental',
  channel: 'social',
  primaryMessage: '',
});

const numberOfRequests = ref(1);
const status = ref<'idle' | 'submitting' | 'success' | 'failed'>('idle');
const errorMessage = ref<string | null>(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function submitRequest() {
  if (!auth.token) {
    router.push('/login');
    return;
  }
  status.value = 'submitting';
  errorMessage.value = null;

  try {
    // Submit multiple requests in parallel
    const promises = Array.from({ length: numberOfRequests.value }, () =>
      fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(form.value),
      })
    );

    const results = await Promise.all(promises);
    
    // Check if all succeeded
    const allSucceeded = results.every(res => res.ok);
    
    if (!allSucceeded) {
      const failedCount = results.filter(res => !res.ok).length;
      if (results.some(res => res.status === 401 || res.status === 403)) {
        auth.clearAuth();
        router.push('/login');
        return;
      }
      throw new Error(`${failedCount} request(s) failed to submit`);
    }

    status.value = 'success';
    
    // Redirect to history page after 1 second
    setTimeout(() => {
      router.push('/history');
    }, 1000);

  } catch (err: any) {
    status.value = 'failed';
    errorMessage.value = err.message;
  }
}

function logout() {
  auth.clearAuth();
  router.push('/login');
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
    <div class="w-full max-w-lg px-6 pb-6 pt-4 bg-slate-900/80 rounded-xl shadow-lg border border-slate-800">
      
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Request Marketing Asset</h1>
        <div class="flex gap-3 text-sm">
             <RouterLink to="/history" class="text-slate-400 hover:text-white">History</RouterLink>
             <button @click="logout" class="text-slate-400 hover:text-white">Logout</button>
        </div>
      </div>

      <form v-if="status === 'idle' || status === 'submitting' || status === 'failed'" @submit.prevent="submitRequest" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
            <div>
            <label class="block text-sm mb-2 text-slate-400">Doctor Name</label>
            <input v-model="form.doctorName" type="text" required placeholder="Dr. Smith" class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
            <label class="block text-sm mb-2 text-slate-400">Practice Type</label>
            <input v-model="form.practiceType" type="text" required placeholder="Dental" class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
        </div>

        <div>
          <label class="block text-sm mb-2 text-slate-400">Practice Name</label>
          <input v-model="form.practiceName" type="text" required placeholder="Bright Smiles" class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label class="block text-sm mb-2 text-slate-400">Channel</label>
          <select v-model="form.channel" class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
            <option value="social">Social Media Post</option>
            <option value="email">Email Campaign</option>
            <option value="poster">Poster</option>
          </select>
        </div>

        <div>
          <label class="block text-sm mb-2 text-slate-400">Primary Message</label>
          <textarea v-model="form.primaryMessage" required rows="3" placeholder="e.g. 50% off teeth whitening this summer..." class="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"></textarea>
        </div>

        <div>
          <label class="block text-sm mb-2 text-slate-400">Number of Requests</label>
          <div class="flex items-center gap-3">
            <input 
              v-model.number="numberOfRequests" 
              type="number" 
              min="1" 
              max="10" 
              class="w-24 rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" 
            />
            <span class="text-xs text-slate-500">Create 1-10 identical requests (for testing workers)</span>
          </div>
        </div>

        <button type="submit" :disabled="status === 'submitting'" class="w-full mt-4 rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ status === 'submitting' ? `Submitting ${numberOfRequests} request(s)...` : `Generate ${numberOfRequests} Asset(s)` }}
        </button>
        
        <p v-if="status === 'failed'" class="text-red-400 text-sm mt-2">Error: {{ errorMessage }}</p>
      </form>

      <div v-if="status === 'success'" class="text-center space-y-4">
        <p class="text-emerald-400 text-lg">✓ Requests submitted successfully!</p>
        <p class="text-slate-400 text-sm">Redirecting to history...</p>
      </div>
    </div>
  </main>
</template>
