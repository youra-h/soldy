/**
 * С внешним `ctrl` его состояние задают через `ctrl`: явный проп рядом с ним —
 * только начальное значение, и синхронизации с `ctrl` он не обещает
 * (AGENTS.md, «Две поверхности управления»).
 *
 * Значение, равное умолчанию, сборка не пишет: она не отличит его от
 * подставленного фреймворком. Другое значение при перемонтировании над тем же
 * `ctrl` может отменить вето прежнего монтирования. Поведение зафиксировано —
 * его смена должна быть решением, а не случайностью.
 */

import { describe, it, expect, vi } from 'vitest'
import { TButton, TPopover } from '@soldy-ui/core'
import type { TActionEvent } from '@soldy-ui/core'
import { Button, Popover } from '@soldy-ui/react'
import { mount, nextFrame } from './mount'

/** Кнопка над `ctrl`, который пользователь уже скрыл. */
function hiddenButton(): TButton {
	const ctrl = new TButton()

	ctrl.visible = false

	return ctrl
}

describe('React: явный проп рядом с внешним ctrl', () => {
	it('проп не передан — ctrl сохраняет своё', () => {
		const ctrl = hiddenButton()

		mount(<Button ctrl={ctrl}>x</Button>)

		expect(ctrl.visible).toBe(false)
	})

	it('явное значение, равное умолчанию, не пишется — и перерисовка с ним тоже', () => {
		const ctrl = hiddenButton()
		const { render } = mount(
			<Button ctrl={ctrl} visible>
				x
			</Button>,
		)

		expect(ctrl.visible).toBe(false)

		render(
			<Button ctrl={ctrl} visible>
				x
			</Button>,
		)

		expect(ctrl.visible).toBe(false)
	})

	it('смена пропа доходит до ctrl', () => {
		const ctrl = hiddenButton()
		const view = (visible: boolean) => (
			<Button ctrl={ctrl} visible={visible}>
				x
			</Button>
		)
		const { render } = mount(view(true))

		render(view(false))
		render(view(true))

		expect(ctrl.visible).toBe(true)
	})

	it('явное значение, отличное от умолчания, — начальное значение ctrl', () => {
		const ctrl = new TButton()

		mount(
			<Button ctrl={ctrl} visible={false}>
				x
			</Button>,
		)

		expect(ctrl.visible).toBe(false)
	})

	it('перемонтирование: вето прежнего отменяет явное значение нового, проп и ctrl расходятся', async () => {
		const ctrl = new TPopover()
		const veto = vi.fn((event: TActionEvent) => event.preventDefault())
		const { render } = mount(
			<Popover key="a" ctrl={ctrl} onHideBefore={veto}>
				x
			</Popover>,
		)

		render(
			<Popover key="b" ctrl={ctrl} visible={false}>
				x
			</Popover>,
		)
		await nextFrame()

		expect(veto).toHaveBeenCalledTimes(1)
		expect(ctrl.visible).toBe(true)
	})
})
