/**
 * Клик по `<input type="checkbox">` у CheckBox и Switch (`TInputBoolPlugin`).
 *
 * `checked` и `indeterminate` браузер переключает ещё до обработчиков клика,
 * поэтому readonly обязан отменить сам клик: отказ на `change` оставил бы DOM
 * переключённым, а модель — прежней.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { TCheckBox, TSwitch } from '@soldy/core'
import { CheckBox, Switch } from '@soldy/ui-vue'

/**
 * Плагин цепляет слушатели по `element:ready`, а TElementPlugin отдаёт его
 * через requestAnimationFrame — значит до следующего кадра слушателей нет.
 */
const mounted = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Инстанс и компонент монтируются в одной записи таблицы. Разнесённые по
 * столбцам, они стали бы независимыми объединениями, и `TCheckBox` уходил бы
 * в `ctrl` компонента `Switch`: карты событий у них разные.
 */
const CHECKABLES = [
	[
		'CheckBox',
		(readonly: boolean) => {
			const ctrl = new TCheckBox({ readonly })
			const input = mount(CheckBox, { props: { ctrl }, attachTo: document.body }).find(
				'input',
			)

			return { ctrl, input }
		},
	],
	[
		'Switch',
		(readonly: boolean) => {
			const ctrl = new TSwitch({ readonly })
			const input = mount(Switch, { props: { ctrl }, attachTo: document.body }).find('input')

			return { ctrl, input }
		},
	],
] as const

describe.each(CHECKABLES)('%s · клик', (_name, mountCheckable) => {
	it('переключает DOM и модель', async () => {
		const { ctrl, input } = mountCheckable(false)

		await mounted()
		await input.trigger('click')

		expect(input.element.checked).toBe(true)
		expect(ctrl.value).toBe(true)
	})

	it('readonly — клик отменён: DOM и модель не меняются', async () => {
		const { ctrl, input } = mountCheckable(true)

		await mounted()
		await input.trigger('click')

		expect(input.element.checked).toBe(false)
		expect(ctrl.value).toBe(false)
	})
})

describe('CheckBox · readonly и indeterminate', () => {
	it('клик не снимает indeterminate у readonly', async () => {
		const ctrl = new TCheckBox({ indeterminate: true, readonly: true })
		const input = mount(CheckBox, { props: { ctrl }, attachTo: document.body }).find('input')

		await mounted()
		await input.trigger('click')

		expect(input.element.indeterminate).toBe(true)
		expect(ctrl.indeterminate).toBe(true)
	})
})
