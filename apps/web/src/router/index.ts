import { createRouter, createWebHistory } from 'vue-router';
import RequestAssetView from '../views/RequestAssetView.vue';
import RequestsHistoryView from '../views/RequestsHistoryView.vue';
import LoginView from '../views/LoginView.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/',
    name: 'RequestAsset',
    component: RequestAssetView
  },
  {
    path: '/history',
    name: 'RequestsHistory',
    component: RequestsHistoryView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// router.beforeEach((to) => {
//   const token = localStorage.getItem('auth_token');
//   if (!token && to.name !== 'Login') {
//     return { name: 'Login' };
//   }
//   if (token && to.name === 'Login') {
//     return { name: 'RequestAsset' };
//   }
//   return true;
// });

export default router;
