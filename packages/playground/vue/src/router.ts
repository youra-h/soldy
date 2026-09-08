import { createRouter, createWebHashHistory } from 'vue-router'
import OverviewPage from './views/OverviewPage.vue'
import ComponentPage from './views/ComponentPage.vue'

/**
 * Страница, открывающаяся при запуске.
 *
 * Отдельной константой, чтобы менять из кода: во время работы над компонентом
 * удобно попадать сразу на него, а не кликать через витрину каждый раз.
 * Например: `'/component/select'`.
 */
export const DEFAULT_ROUTE = '/'

/**
 * История в хеше, а не в путях: стенд открывают и как dev-сервер, и как
 * статику из файла — при `createWebHistory` второй вариант отдаёт 404 на любой
 * маршрут, кроме корня.
 */
export const router = createRouter({
	history: createWebHashHistory(),
	routes: [
		{ path: '/', name: 'overview', component: OverviewPage },
		{ path: '/component/:id', name: 'component', component: ComponentPage, props: true },
		{ path: '/:pathMatch(.*)*', redirect: DEFAULT_ROUTE },
	],
})
