import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import OverviewPage from './views/OverviewPage.vue'
import ComponentPage from './views/ComponentPage.vue'
import TestsPage from './views/TestsPage.vue'
import AppSidebar from './components/AppSidebar.vue'
import TestsSidebar from './components/TestsSidebar.vue'
import { TOPICS } from './catalog'

/**
 * Страница, открывающаяся при запуске.
 *
 * Отдельной константой, чтобы менять из кода: во время работы над компонентом
 * удобно попадать сразу на него, а не кликать через витрину каждый раз.
 * Например: `'/component/select'` или `'/tests/events'`.
 */
export const DEFAULT_ROUTE = '/'

/** Страница тестов: всё, что под `/tests`. */
export const TESTS_ROUTE = '/tests'

/**
 * Последняя страница свойств — витрина или компонент.
 *
 * На неё ведёт ссылка «Свойства» со страницы тестов: ушёл проверить Button —
 * вернулся на Button, а не на витрину.
 */
export const propertiesRoute = ref('/')

/**
 * История в хеше, а не в путях: стенд открывают и как dev-сервер, и как
 * статику из файла — при `createWebHistory` второй вариант отдаёт 404 на любой
 * маршрут, кроме корня.
 *
 * Левая панель — именованный вид маршрута: у страницы свойств меню
 * компонентов, у страницы тестов меню тем.
 */
export const router = createRouter({
	history: createWebHashHistory(),
	routes: [
		{
			path: '/',
			name: 'overview',
			components: { default: OverviewPage, sidebar: AppSidebar },
		},
		{
			path: '/component/:id',
			name: 'component',
			components: { default: ComponentPage, sidebar: AppSidebar },
			props: { default: true },
		},
		{
			// Без темы — первая доступная; тем нет — пустое состояние страницы
			path: TESTS_ROUTE,
			name: 'tests',
			components: { default: TestsPage, sidebar: TestsSidebar },
			beforeEnter: () => (TOPICS.length ? `${TESTS_ROUTE}/${TOPICS[0].id}` : true),
		},
		{
			path: `${TESTS_ROUTE}/:topic`,
			name: 'topic',
			components: { default: TestsPage, sidebar: TestsSidebar },
			props: { default: true },
		},
		{ path: '/:pathMatch(.*)*', redirect: DEFAULT_ROUTE },
	],
})

router.afterEach((to) => {
	if (!to.path.startsWith(TESTS_ROUTE)) propertiesRoute.value = to.fullPath
})
