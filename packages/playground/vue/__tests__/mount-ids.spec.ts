/**
 * Id в разметке двух превью одного компонента не пересекаются — у каждого
 * фреймворка.
 *
 * Превью хост рисует своим корнем фреймворка, у Vue — своим приложением
 * (`createApp`), а id монтирования, от которого плагины строят `id` частей,
 * ссылки ARIA и пометку панели (`data-owner`), адаптер берёт у фреймворка.
 * `useId` Vue считает места внутри приложения, и у двух приложений с одним
 * деревом id совпадали. Все панели DatePicker на странице получали одну
 * пометку, плагины оверлея находили по ней первую в документе — чужую и
 * скрытую, — и фокус с кнопки календаря в свою панель не уходил. Поэтому
 * хост Vue даёт каждому приложению свой `idPrefix`.
 *
 * Компонент — Tabs: он есть у всех хостов, и `id` табов и панелей у него от
 * монтирования (у Web Components — от счётчика набора: id монтирования
 * адаптер там не передаёт).
 */

import { describe, it, expect, afterEach } from 'vitest'
import type { IPreviewHandle } from '@soldy-ui/playground-shared'
import { FRAMEWORKS, hostOf, loadHost } from '../src/hosts'

/** Хосты — загрузчиком, как их грузит роутер: мимо него тест хост не импортирует. */
await Promise.all(FRAMEWORKS.map(({ id }) => loadHost(id)))

/** Кадр: `TElementPlugin` объявляет узел через него, Web Components рисуют в микрозадаче. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Узлы оболочки и превью в них — снимаются после теста, даже упавшего. */
const nodes: HTMLElement[] = []
const mounts: IPreviewHandle[] = []

function stage(): HTMLElement {
	const node = document.createElement('div')

	document.body.appendChild(node)
	nodes.push(node)

	return node
}

afterEach(() => {
	for (const mounted of mounts.splice(0)) mounted.unmount()
	for (const node of nodes.splice(0)) node.remove()
})

/** `id` в разметке превью. */
const idsIn = (node: Element): string[] => [...node.querySelectorAll('[id]')].map(({ id }) => id)

describe('id двух превью одного компонента', () => {
	it.each(FRAMEWORKS.map(({ id, label }) => [label, id]))(
		'%s: у двух превью Tabs общих id нет',
		async (_label, framework) => {
			const host = hostOf(framework)
			const [first, second] = [stage(), stage()]

			for (const node of [first, second]) {
				mounts.push(host.mount(node, { component: 'tabs', props: {} }))
			}

			await nextFrame()

			const own = idsIn(first)
			const other = new Set(idsIn(second))

			expect(own.length, 'id в разметке превью есть').toBeGreaterThan(0)
			expect(own.filter((id) => other.has(id))).toEqual([])
		},
	)
})
