/**
 * Монтирование в тестах компонентов Solid.
 *
 * Корень Solid — на своём узле в документе: Frame уводит панель в `body`, и
 * узлы ищутся по документу. После каждого теста корни снимаются в порядке,
 * обратном монтированию, документ чистится: хук ставит сам этот модуль,
 * забыть его в файле теста нельзя.
 *
 * Пропсы после монтирования меняет тест: сигнал (`createSignal`), который
 * читает разметка теста, — это и есть смена пропа родителем. Solid применяет
 * её синхронно, к возврату из сеттера сигнала DOM уже новый.
 */

import { afterEach } from 'vitest'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

const disposers: Array<() => void> = []

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) dispose()

	document.body.innerHTML = ''
})

export type TMounted = {
	/** Узел, в который смонтирован корень Solid. */
	container: HTMLElement
	/** Корень компонента — первый элемент контейнера. */
	root: () => HTMLElement
	/** Снять корень раньше конца теста. */
	destroy: () => void
}

/** Смонтировать разметку; к возврату она в DOM, эффекты выполнены. */
export function mount(code: () => JSX.Element): TMounted {
	const container = document.createElement('div')

	document.body.appendChild(container)

	const dispose = render(code, container)

	disposers.push(dispose)

	return {
		container,
		root: () => find(container, ':scope > *', HTMLElement),
		destroy: () => {
			disposers.splice(disposers.indexOf(dispose), 1)
			dispose()
		},
	}
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
export function find<T extends Element>(
	scope: ParentNode,
	selector: string,
	type: { new (): T; prototype: T },
): T {
	const element = scope.querySelector(selector)

	if (!(element instanceof type)) throw new Error(`${selector}: нужного узла нет`)

	return element
}

/**
 * Кадр: `TElementPlugin` объявляет узел через `requestAnimationFrame`, а
 * слушатели плагинов встают по его `ready`.
 */
export async function nextFrame(): Promise<void> {
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}
