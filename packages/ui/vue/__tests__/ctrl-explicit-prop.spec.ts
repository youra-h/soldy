/**
 * С внешним `ctrl` его состояние задают через `ctrl`: явный проп рядом с ним —
 * только начальное значение, и синхронизации с `ctrl` он не обещает
 * (AGENTS.md, «Две поверхности управления»).
 *
 * Значение, равное умолчанию, сборка не пишет: она не отличит его от
 * подставленного фреймворком. Поведение зафиксировано — его смена должна быть
 * решением, а не случайностью.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TButton } from '@soldy-ui/core'
import { Button } from '@soldy-ui/vue'

/** Кнопка над `ctrl`, который пользователь уже скрыл. */
function hiddenButton(): TButton {
	const ctrl = new TButton()

	ctrl.visible = false

	return ctrl
}

describe('Vue: явный проп рядом с внешним ctrl', () => {
	it('проп не передан — ctrl сохраняет своё', async () => {
		const ctrl = hiddenButton()

		mount(Button, { props: { ctrl } })
		await nextTick()

		expect(ctrl.visible).toBe(false)
	})

	it('явное значение, равное умолчанию, не пишется — и перерисовка с ним тоже', async () => {
		const ctrl = hiddenButton()
		const wrapper = mount(Button, { props: { ctrl, visible: true } })

		await nextTick()

		expect(ctrl.visible).toBe(false)

		await wrapper.setProps({ visible: true })

		expect(ctrl.visible).toBe(false)
	})

	it('смена пропа доходит до ctrl', async () => {
		const ctrl = hiddenButton()
		const wrapper = mount(Button, { props: { ctrl, visible: true } })

		await wrapper.setProps({ visible: false })
		await wrapper.setProps({ visible: true })

		expect(ctrl.visible).toBe(true)
	})

	it('явное значение, отличное от умолчания, — начальное значение ctrl', async () => {
		const ctrl = new TButton()

		mount(Button, { props: { ctrl, visible: false } })
		await nextTick()

		expect(ctrl.visible).toBe(false)
	})
})
