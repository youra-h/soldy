/**
 * Монтирование в браузерных спеках — своим приложением Vue, а не `render` из
 * `vitest-browser-vue`.
 *
 * Тот монтирует через `@vue/test-utils`, а она с первого `mount` записывает
 * каждый `emit` каждого приложения Vue на странице вместе с аргументами —
 * событиями DOM, экземплярами ядра, узлами. Стирает она записи только своего
 * приложения, и то до `app.unmount()`: всё, что компоненты эмитят при снятии,
 * записывается заново и живёт до конца файла. К концу `calendar.spec.ts`
 * копилось 200 МБ живой кучи и 87 тысяч узлов (своим приложением — 32 МБ и 84
 * узла), к концу `drag-and-drop.spec.ts` — 533 МБ: превью стенда — отдельные
 * приложения хоста Vue, и их записи не стирались вовсе.
 *
 * Снимает смонтированное `cleanup` — спек зовёт его сам, когда порядок важен
 * (снять компонент, потом вернуть направление или режим движения), — а что
 * осталось, снимает хук после теста, как снимал `vitest-browser-vue`.
 */

import { afterEach } from 'vitest'
import { createApp, type Component, type Plugin } from 'vue'

/** Снятие каждого смонтированного и ещё не снятого. */
const mounted = new Set<() => void>()

type TRenderOptions = {
	/** Плагины приложения — роутер стенда. */
	readonly plugins?: readonly Plugin[]
}

/** Монтирует компонент своим приложением в свой узел в `body` и отдаёт этот узел. */
export function render(component: Component, { plugins = [] }: TRenderOptions = {}): HTMLElement {
	const node = document.createElement('div')
	const app = createApp(component)

	for (const plugin of plugins) app.use(plugin)

	document.body.append(node)
	app.mount(node)

	const unmount = () => {
		mounted.delete(unmount)
		app.unmount()
		node.remove()
	}

	mounted.add(unmount)

	return node
}

/** Снимает всё, что смонтировал `render`, и убирает узлы. */
export function cleanup(): void {
	for (const unmount of [...mounted]) unmount()
}

afterEach(cleanup)
