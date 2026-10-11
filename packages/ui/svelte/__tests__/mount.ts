/**
 * Монтирование в тестах компонентов Svelte.
 *
 * Компонент — на своём узле в документе: Frame уводит панель в `body`, и узлы
 * ищутся по документу. После каждого теста компоненты снимаются в порядке,
 * обратном монтированию, документ чистится: хук ставит сам этот модуль,
 * забыть его в файле теста нельзя.
 *
 * Пропсы после монтирования меняет тест: объект `reactiveProps` — пропсы
 * родителя, присваивание его полю — смена пропа (`reactive-props.svelte.ts`).
 * Svelte применяет её на своём такте, и тест сбрасывает его `flushSync()`.
 */

import { afterEach } from 'vitest'
import { flushSync, mount as mountComponent, unmount, type Component } from 'svelte'

const mounted: Record<string, unknown>[] = []

afterEach(() => {
	for (const app of mounted.splice(0).reverse()) void unmount(app)

	document.body.innerHTML = ''
})

export type TMounted = {
	/** Узел, в который смонтирован компонент. */
	container: HTMLElement
	/** Корень компонента — первый элемент контейнера. */
	root: () => HTMLElement
	/** Снять компонент раньше конца теста. */
	destroy: () => void
}

/** Смонтировать компонент; к возврату он в DOM, эффекты выполнены. */
export function mount<TProps extends Record<string, any>>(
	component: Component<TProps>,
	props: TProps,
): TMounted {
	const container = document.createElement('div')

	document.body.appendChild(container)

	const app = mountComponent(component, { target: container, props })

	mounted.push(app)
	flushSync()

	return {
		container,
		root: () => find(container, ':scope > *', HTMLElement),
		destroy: () => {
			mounted.splice(mounted.indexOf(app), 1)
			void unmount(app)
			flushSync()
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
	flushSync()
}

/** Узлы, с которыми пришёл `element:ready`, и колбэк, который их собирает. */
export type TReadyProbe = {
	readonly onElementReady: (element: Element) => void
	readonly elements: readonly Element[]
}

/**
 * Пробник `element:ready`: узел сверяют по ссылке (`toBe`) с последним
 * пришедшим.
 *
 * Не мок с `toHaveBeenCalledWith(узел)`: сообщение этой проверки chai собирает
 * и при успехе, а его инспектор узла доходит до `globalThis`, где Svelte в
 * разработке держит ловушки рун (`$state` вне компонента), и тест падает с
 * `rune_outside_svelte`.
 */
export function readyProbe(): TReadyProbe {
	const elements: Element[] = []

	return { elements, onElementReady: (element) => elements.push(element) }
}
