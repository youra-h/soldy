/**
 * Гидратация разметки сервера в тестах Solid — общее у спеков `*.hydration`.
 *
 * Разметку сервера тест кладёт в документ, как её получает браузер, и
 * гидратирует её страницей, собранной для браузера с метками гидратации
 * (`pages.tsx`). Контейнер стоит в документе: узел вне документа Solid
 * гидратацией не считает и пишет в него сам — спек был бы зелёным и без
 * механики, которую он стережёт. После каждого теста корни снимаются в
 * порядке, обратном гидратации, документ чистится: хук ставит сам этот
 * модуль, как `mount.ts`.
 */

import { afterEach, expect } from 'vitest'
import type { JSX } from 'solid-js'
import { hydrate } from 'solid-js/web'

const disposers: Array<() => void> = []

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) dispose()

	document.body.innerHTML = ''
})

/** Разметка сервера в документе — как её получает браузер. */
export function serve(markup: string): HTMLElement {
	const container = document.createElement('div')

	container.innerHTML = markup
	document.body.append(container)

	return container
}

/**
 * Гидратировать разметку сервера в `container` страницей `page`. Состояние
 * гидратации `_$HY` в страницу кладёт скрипт сервера приложения
 * (`generateHydrationScript`) — здесь его кладёт тест.
 */
export function hydrateServed(container: HTMLElement, page: () => JSX.Element): void {
	Object.assign(globalThis, { _$HY: { events: [], completed: new WeakSet(), r: {}, fe() {} } })
	disposers.push(hydrate(page, container))
}

/** Узлы после гидратации — те же, что прислал сервер. */
export function expectServedNodes(nodes: readonly Element[], served: readonly Element[]): void {
	expect(nodes).toHaveLength(served.length)
	nodes.forEach((node, index) => expect(node).toBe(served[index]))
}
