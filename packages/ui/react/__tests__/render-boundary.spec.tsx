/**
 * The render boundary (`withRenderBoundary`) — a mechanism of React's adapter
 * layer.
 *
 * The parent redraws a component under the boundary only when a prop changed
 * by identity, and its own state — the component's binding — redraws it as
 * usual. Under the boundary is a real Button: its render is counted by the
 * `children` slot under a spy, which Button calls exactly once per render.
 *
 * Where the boundary stands and what it saves — Table's rows and cells
 * (`table-row-renders.spec.tsx`, «перерисовка ячеек» in `table.spec.tsx`)
 * and the collections' items (`item-renders.spec.tsx`).
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { act, type ComponentProps, type CSSProperties } from 'react'
import { TButton } from '@soldy-ui/core'
import { Button, withRenderBoundary, type ButtonProps } from '@soldy-ui/react'
import { mount, nextFrame } from './mount'

/** Button under the boundary. */
const BoundedButton = withRenderBoundary(Button)

/**
 * A button over `ctrl` under the boundary; the slot is a spy, cleared after
 * mounting. `rerender` is the parent's next render: the same `ctrl` and slot,
 * and the style, if given, a new object with the same content.
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

	// The button is drawn by the slot: otherwise the counter below would guard nothing
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
