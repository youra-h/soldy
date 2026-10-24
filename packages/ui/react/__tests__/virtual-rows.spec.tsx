/**
 * Строка элемента живёт столько же, сколько её разметка, а не столько, сколько
 * элемент в коллекции: экземпляр `TItemRow` создаёт монтирование `ItemRow` и
 * отпускает его снятие. Окно `Virtual` ради этого и есть — большой список при
 * памяти на то, что показано, — и элемент, однажды показанный окном, строки за
 * собой не держит. Сценарий Vue — `ui/vue/__tests__/virtual-rows.spec.ts`.
 *
 * `queryObjects` из `node:v8` сам собирает мусор и считает достижимые
 * экземпляры класса (см. `first-render-props.spec.tsx`). Корень собирается и
 * снимается во вложенной функции: последнее дерево держат её переменные, и
 * после возврата его не держит никто. Замер окна подаётся ядру руками, как в
 * `virtual.spec.tsx`.
 */

import { describe, it, expect } from 'vitest'
import { act, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { queryObjects } from 'node:v8'
import { TItemRow, createEngineListBox, createEngineSelect } from '@soldy-ui/core'
import type { TDrawViewport } from '@soldy-ui/core'
import { ListBox, Select, Virtual } from '@soldy-ui/react'
import { nextFrame } from './mount'

const rows = () => queryObjects(TItemRow, { format: 'count' })

/** Видно 10 мест по 30px, с запасом окна — до 30 строк. */
const WINDOW = 30
const COUNT = 1000

function items(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		value: `v${index + 1}`,
		text: `Пункт ${index + 1}`,
	}))
}

type TWindowed = {
	readonly extensions: { readonly draw: { notifyViewport(viewport: TDrawViewport): void } }
}

/**
 * Собрать в окне, пролистать по экрану за шаг от первого места до последнего
 * и снять. Возвращает, сколько строк было живо у конца списка.
 */
async function scrollThrough(engine: TWindowed, element: ReactElement): Promise<number> {
	const container = document.body.appendChild(document.createElement('div'))
	const root = createRoot(container)

	act(() => root.render(element))
	await nextFrame()

	for (let top = 0; top < COUNT * 30; top += 300) {
		act(() => engine.extensions.draw.notifyViewport({ top, bottom: top + 300, step: 30 }))
		await nextFrame()
	}

	const alive = rows()

	act(() => root.unmount())
	container.remove()

	return alive
}

describe('строки — только у нарисованных', () => {
	it('ListBox: пролистанный до конца — строк не больше окна, снятый — ни одной', async () => {
		const engine = createEngineListBox({ items: items(COUNT) })
		const alive = await scrollThrough(
			engine,
			<Virtual>
				<ListBox engine={engine} />
			</Virtual>,
		)

		expect(alive).toBeGreaterThan(0)
		expect(alive).toBeLessThanOrEqual(WINDOW)
		expect(rows()).toBe(0)
	}, 60000)

	it('Select: пролистанный до конца — строк не больше окна, снятый — ни одной', async () => {
		const engine = createEngineSelect({ items: items(COUNT) })
		const alive = await scrollThrough(
			engine,
			<Virtual>
				<Select engine={engine} />
			</Virtual>,
		)

		expect(alive).toBeGreaterThan(0)
		expect(alive).toBeLessThanOrEqual(WINDOW)
		expect(rows()).toBe(0)
	}, 60000)
})
