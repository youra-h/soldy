/**
 * Гидратация разметки сервера в тестах Svelte — общее у спеков `*.hydration`.
 *
 * Разметку сервера тест кладёт в документ, как её получает браузер, и
 * гидратирует её той же страницей, собранной для браузера (`hydrate` из
 * `svelte`). Разметка — фикстура из `markup/`: её пишет и сверяет серверный
 * прогон (`markup.server.spec.ts`), страницы — те же. Контейнер стоит в
 * документе: Frame уводит панель в `body`, и узлы ищутся по документу.
 *
 * Расхождение сервера и браузера ловят три проверки:
 *
 * - `hydrate` с `recover: false`: расхождение структуры, которое Svelte не
 *   разбирает сам, — исключение, а не страница, нарисованная заново поверх
 *   разметки сервера;
 * - сторож консоли: предупреждение Svelte (`hydration_mismatch` и прочие) или
 *   библиотеки роняет тест;
 * - сверка узлов (`expectServedNodes`): после гидратации узлы те же, что
 *   прислал сервер. Расхождение атрибутов Svelte чинит на месте без
 *   предупреждения, и ловит его сверка значений в самом спеке.
 *
 * Хуки ставит сам этот модуль, как `mount.ts`: после каждого теста корни
 * снимаются в порядке, обратном гидратации, документ чистится, а пойманное
 * сторожем роняет тест. В общий `setup.ts` сторож не вынесен: оттуда он
 * включился бы для всего пакета.
 *
 * Сторож — обёртка над методами консоли, а не `vi.spyOn`, и без фильтра по
 * тексту — правило то же, что у React (`packages/ui/react/__tests__/setup.ts`):
 * предупреждение Svelte и диагностика библиотеки — одинаково находки, шумит
 * сторож — чинится причина. Вывод он не глушит: в логе прогона тот остаётся
 * таким, каким его напечатали. Тест, который вывод ожидает, заявляет это своим
 * шпионом с заглушкой — `vi.spyOn(console, 'warn').mockImplementation(() => {})`:
 * заглушка обёртку не зовёт, и сторож такого вызова не видит.
 */

import { afterEach, beforeEach, expect } from 'vitest'
import { flushSync, hydrate, unmount, type Component } from 'svelte'

/** Методы консоли, вызов которых роняет тест. */
type TGuardedMethod = 'error' | 'warn'

/** Корни, гидратированные в текущем тесте, — по порядку. */
const hydrated: Record<string, unknown>[] = []

/** Тексты вызовов консоли за текущий тест. */
let messages: string[] = []

/** Вернуть методы консоли, какими их застал `beforeEach`. */
let restore: Array<() => void> = []

/**
 * Аргумент вызова консоли — строкой, у ошибки — со стеком. Своя строка, а не
 * `format` из `node:util`, как у React: типов Node у пакета нет, а печатает
 * вызов сама консоль.
 */
function textOf(arg: unknown): string {
	return arg instanceof Error ? (arg.stack ?? String(arg)) : String(arg)
}

/** Обернуть метод консоли: вызов записывается в `into` и печатается как есть. */
function watch(method: TGuardedMethod, into: string[]): () => void {
	const original: (...args: unknown[]) => void = console[method]

	console[method] = (...args: unknown[]) => {
		into.push(`console.${method}: ${args.map(textOf).join(' ')}`)
		original.apply(console, args)
	}

	return () => {
		console[method] = original
	}
}

beforeEach(() => {
	messages = []
	restore = [watch('error', messages), watch('warn', messages)]
})

afterEach(() => {
	// Вывод при снятии корней — тоже в счёт теста
	for (const app of hydrated.splice(0).reverse()) void unmount(app)

	document.body.innerHTML = ''

	// Консоль возвращается до проверки: после упавшего `expect` хук дальше не идёт
	for (const undo of restore.splice(0)) undo()

	expect(messages, 'в консоль ушли ошибки или предупреждения').toEqual([])
})

/** Разметка сервера в документе — как её получает браузер. */
export function serve(markup: string): HTMLElement {
	const container = document.createElement('div')

	container.innerHTML = markup
	document.body.append(container)

	return container
}

/**
 * Гидратировать разметку сервера в `container` страницей `page` с пропсами
 * `props`; к возврату эффекты выполнены. Расхождение структуры — исключение
 * (`recover: false`): без него Svelte стёр бы разметку сервера и нарисовал
 * страницу заново, и сверка узлов увидела бы уже не её.
 */
export function hydrateServed<TProps extends Record<string, any>>(
	container: HTMLElement,
	page: Component<TProps>,
	props: TProps,
): void {
	hydrated.push(hydrate(page, { target: container, props, recover: false }))
	flushSync()
}

/** Узлы после гидратации — те же, что прислал сервер. */
export function expectServedNodes(nodes: readonly Element[], served: readonly Element[]): void {
	expect(nodes).toHaveLength(served.length)
	nodes.forEach((node, index) => expect(node).toBe(served[index]))
}
