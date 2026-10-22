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

/** Что гидратации нужно от сервера, кроме разметки. */
export type THydrateOptions = {
	/** Данные от сервера (`_$HY.r`) — их пишут скрипты потока. */
	readonly resources?: Readonly<Record<string, unknown>>
	/** Ключ гидратации корня (`renderId`) — у острова свой, тот же, что у сервера. */
	readonly renderId?: string
}

/**
 * Гидратировать разметку сервера в `container` страницей `page`. Состояние
 * гидратации `_$HY` в страницу кладёт скрипт сервера приложения
 * (`generateHydrationScript`) — здесь его кладёт тест, а с ним и данные от
 * сервера (`resources`).
 */
export function hydrateServed(
	container: HTMLElement,
	page: () => JSX.Element,
	options: THydrateOptions = {},
): void {
	Object.assign(globalThis, {
		_$HY: { events: [], completed: new WeakSet(), r: { ...options.resources }, fe() {} },
	})
	disposers.push(hydrate(page, container, { renderId: options.renderId }))
}

/** Узлы после гидратации — те же, что прислал сервер. */
export function expectServedNodes(nodes: readonly Element[], served: readonly Element[]): void {
	expect(nodes).toHaveLength(served.length)
	nodes.forEach((node, index) => expect(node).toBe(served[index]))
}

/** Поток сервера в документе: оболочка сразу, граница `Suspense` — когда дослана. */
export type TStreamed = {
	/** Контейнер разметки — его гидратирует `hydrateServed`. */
	readonly container: HTMLElement
	/**
	 * Что гидратации нужно от сервера (`hydrateServed`): данные границы —
	 * обещание, которое разрешает `resolve()`. Пока оно ждёт, браузер границу
	 * не гидратирует.
	 */
	readonly options: THydrateOptions
	/** Сервер дослал содержимое границы: его скрипт ставит его на место метки. */
	deliver(): void
	/**
	 * Данные границы разрешились: браузер гидратирует её — это окно поздней
	 * гидратации. Промис ждёт его конца.
	 */
	resolve(): Promise<void>
}

/**
 * Поток сервера с одной досланной границей `Suspense` (`markup.server.spec.tsx`)
 * — в документе, как его получает браузер. Оболочка — поток до содержимого
 * границы: её метку (`<template id="pl-<ключ>">`) и данные сервер отдаёт
 * сразу, а содержимое (`<template id="<ключ>">`) и скрипт, который ставит его
 * на место метки (`$df`), — следом. Скрипты потока в документе не
 * выполняются: что они делают, повторяют `options`, `deliver()` и
 * `resolve()`.
 */
export function serveStreamed(stream: string): TStreamed {
	const key = /<template id="pl-([^"]+)">/.exec(stream)?.[1]
	const start = key === undefined ? -1 : stream.indexOf(`<template id="${key}">`)

	if (key === undefined || start < 0) throw new Error('в потоке нет границы, досланной позже')

	const container = serve(stream.slice(0, start))
	let release = () => {}
	const data = new Promise<void>((resolve) => (release = resolve))

	return {
		container,
		options: { resources: { [key]: data } },
		deliver() {
			const delivered = document.createElement('template')

			delivered.innerHTML = stream.slice(start)

			const content = delivered.content.querySelector(`template[id="${key}"]`)
			let node: ChildNode | null = document.getElementById(`pl-${key}`)

			// Как `$df`: от метки до комментария `pl-<ключ>` — прочь, комментарий —
			// содержимым границы
			while (node && !(node instanceof Comment && node.data === `pl-${key}`)) {
				const next: ChildNode | null = node.nextSibling

				node.remove()
				node = next
			}

			if (!node || !(content instanceof HTMLTemplateElement)) {
				throw new Error(`граница ${key}: нет метки в документе или содержимого в потоке`)
			}

			node.replaceWith(content.content)
		},
		async resolve() {
			release()
			// Гидратацию границы Solid подписал на эти данные раньше теста, и
			// окно поздней гидратации закрывается до продолжения здесь
			await data
		},
	}
}
