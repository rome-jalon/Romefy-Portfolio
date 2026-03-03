import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'portfolio',
      component: () => import('@/views/PortfolioView.vue'),
    },
    {
      path: '/nutrition',
      name: 'nutrition',
      component: () => import('@/views/NutritionApp.vue'),
    },
    {
      path: '/task-breakdown',
      name: 'task-breakdown',
      component: () => import('@/views/TaskBreakdownApp.vue'),
    },
    {
      path: '/ecg-analyzer',
      name: 'ecg-analyzer',
      component: () => import('@/views/EcgAnalyzerApp.vue'),
    },
    {
      path: '/urban-change',
      name: 'urban-change',
      component: () => import('@/views/UrbanChangeApp.vue'),
    },
    {
      path: '/ecg-monitor',
      name: 'ecg-monitor',
      component: () => import('@/views/EcgMonitorApp.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
