import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { DEFAULT_FRAMEWORK, isFramework } from './hosts'

/**
 * Адреса стенда — без самого роутера: их читают и маршруты, и компоненты,
 * которые роутер подключает, а модуль роутера импортирует эти компоненты.
 *
 * Первый сегмент адреса — фреймворк превью: `/react/button`,
 * `/vue/tests/events/button`.
 */

/**
 * Страница, открывающаяся при запуске.
 *
 * Отдельной константой, чтобы менять из кода: во время работы над компонентом
 * удобно попадать сразу на него, а не кликать через витрину каждый раз.
 * Например: `'/vue/select'` или `'/react/tests/events/button'`.
 */
export const DEFAULT_ROUTE = `/${DEFAULT_FRAMEWORK}`

/** Маршруты страницы тестов: без темы, без компонента и полный. */
const TESTS_ROUTES: ReadonlySet<unknown> = new Set(['tests', 'topic', 'scenarios'])

/** Страница тестов ли это — у неё своя левая панель и своя ссылка в шапке. */
export function isTestsRoute(route: Pick<RouteLocationNormalized, 'name'>): boolean {
	return TESTS_ROUTES.has(route.name)
}

/** Фреймворк маршрута — первый сегмент адреса. */
export function frameworkOf(route: Pick<RouteLocationNormalized, 'params'>): string {
	const { framework } = route.params

	return isFramework(framework) ? framework : DEFAULT_FRAMEWORK
}

/**
 * Тот же адрес на другом фреймворке: меняется только первый сегмент. Страница
 * компонента остаётся страницей компонента — нет его у фреймворка, она так и
 * скажет.
 */
export function withFramework(path: string, framework: string): string {
	return path.replace(/^\/[^/]*/, `/${framework}`)
}

/**
 * Последняя страница свойств — витрина или компонент, без фреймворка: `''` или
 * `/button`.
 *
 * На неё ведёт ссылка «Свойства» со страницы тестов: ушёл проверить Button —
 * вернулся на Button, а не на витрину. Фреймворк у ссылки — текущий: тесты и
 * свойства переключаются в его пределах.
 */
const propertiesTail = ref('')

export function propertiesPath(framework: string): string {
	return `/${framework}${propertiesTail.value}`
}

/** Запомнить страницу свойств, на которую пришли. Зовёт роутер после перехода. */
export function rememberProperties(to: Pick<RouteLocationNormalized, 'name' | 'params'>): void {
	if (to.name === 'overview') propertiesTail.value = ''
	if (to.name === 'component') propertiesTail.value = `/${String(to.params.id)}`
}
