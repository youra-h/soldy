/**
 * Монтирование в тестах компонентов React.
 *
 * Корень React — на своём узле в документе: портал Frame уходит в `body`, а
 * клик по подписи браузер доводит до поля только в документе. Перерисовка тем
 * же корнем — так родитель меняет пропсы. После каждого теста корни
 * размонтируются, документ чистится: хук ставит сам этот модуль, забыть его в
 * файле теста нельзя.
 */

import { afterEach } from 'vitest'
import { act } from 'react'
import type { ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const roots: Root[] = []

afterEach(() => {
	// С конца — в порядке, обратном монтированию
	for (const root of roots.splice(0).reverse()) {
		act(() => root.unmount())
	}

	document.body.innerHTML = ''
})

export type TMounted = {
	/** Узел, в который смонтирован корень React. */
	container: HTMLElement
	/** Корень компонента — первый элемент контейнера. */
	root: () => HTMLElement
	/** Перерисовать тем же корнем. */
	render: (next: ReactElement) => void
}

export function mount(element: ReactElement): TMounted {
	const container = document.createElement('div')

	document.body.appendChild(container)

	const reactRoot = createRoot(container)

	roots.push(reactRoot)

	const render = (next: ReactElement) => {
		act(() => reactRoot.render(next))
	}

	render(element)

	return {
		container,
		root: () => find(container, ':scope > *', HTMLElement),
		render,
	}
}

/** Корень React, созданный тестом сам (гидратация): его тоже размонтирует хук. */
export function track(root: Root): void {
	roots.push(root)
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
 * слушатели плагинов встают по его `ready`. Ожидание — внутри `act`: `ready`
 * меняет состояние компонента.
 */
export async function nextFrame(): Promise<void> {
	await act(async () => {
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
	})
}
