/**
 * Граница перерисовки (`withRenderBoundary`) — механика адаптерного слоя React.
 *
 * Компонент под границей родитель перерисовывает, только когда сменился проп
 * по идентичности, а своё состояние — связка компонента — перерисовывает его
 * как обычно. Под границей — настоящий Button: его рендер считает слот
 * `children` под шпионом, Button зовёт его ровно раз за рендер.
 *
 * Где граница стоит и что она экономит — строки и ячейки Table
 * (`table-row-renders.spec.tsx`, «перерисовка ячеек» в `table.spec.tsx`).
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { act, type ComponentProps, type CSSProperties } from 'react'
import { TButton } from '@soldy-ui/core'
import { Button, withRenderBoundary, type ButtonProps } from '@soldy-ui/react'
import { mount, nextFrame } from './mount'

/** Button под границей. */
const BoundedButton = withRenderBoundary(Button)

/**
 * Кнопка над `ctrl` под границей; слот — шпион, сброшенный после монтирования.
 * `rerender` — следующий рендер родителя: `ctrl` и слот те же, а стиль, если
 * задан, — новый объект с тем же содержимым.
 */
async function renderCounted(ctrl: TButton, style?: CSSProperties) {
	const slot = vi.fn(({ text }: { text: string }) => text)
	const view = () => (
		<BoundedButton ctrl={ctrl} style={style && { ...style }}>
			{slot}
		</BoundedButton>
	)
	const mounted = mount(view())

	await nextFrame()

	// Кнопка нарисована слотом: иначе счётчик ниже ничего бы не стерёг
	expect(slot).toHaveBeenCalled()
	slot.mockClear()

	return { slot, root: mounted.root, rerender: () => mounted.render(view()) }
}

describe('граница перерисовки', () => {
	it('пропсы компонента под границей — те же', () => {
		expectTypeOf<ComponentProps<typeof BoundedButton>>().toEqualTypeOf<ButtonProps>()
	})

	it('родитель перерисован с теми же пропсами — компонент нет', async () => {
		const { slot, rerender } = await renderCounted(new TButton({ text: 'Сохранить' }))

		rerender()

		expect(slot).not.toHaveBeenCalled()
	})

	it('проп — новый объект с тем же содержимым: компонент перерисован, сравнение по идентичности', async () => {
		const { slot, rerender, root } = await renderCounted(new TButton({ text: 'Сохранить' }), {
			color: 'red',
		})

		rerender()

		expect(slot).toHaveBeenCalledTimes(1)
		expect(root().style.color).toBe('red')
	})

	it('своя связка сменилась — компонент перерисован, хотя родитель нет', async () => {
		const ctrl = new TButton({ text: 'Сохранить' })
		const { slot, root } = await renderCounted(ctrl)

		act(() => {
			ctrl.text = 'Отправить'
		})

		expect(slot.mock.calls).toEqual([[{ text: 'Отправить' }]])
		expect(root().textContent).toBe('Отправить')
	})
})
