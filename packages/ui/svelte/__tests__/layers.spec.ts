/**
 * Слои без своей разметки — Interactive, ValueControl, InputControl: сборка
 * своей setup-функцией по своему дескриптору.
 *
 * Разметки у слоя нет, и проверяется проводка: пропсы разметки доходят до
 * инстанса, внешний `ctrl` — тот самый инстанс, а его смена доходит до
 * состояния, которое отдаёт связка. Состояние обёртка печатает текстом
 * (`Layer.test.svelte`).
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { flushSync } from 'svelte'
import { TInputControl, TInteractive, TValueControl } from '@soldy-ui/core'
import {
	setupInputControl,
	setupInteractive,
	setupValueControl,
	type InputControlProps,
	type InteractiveProps,
	type ValueControlProps,
} from '@soldy-ui/svelte'
import Layer from './Layer.test.svelte'
import { find, mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** Состояние слоя, как его отдала связка. */
function state(): Record<string, unknown> {
	const text = find(document, '.so-test-state', HTMLElement).textContent ?? '{}'
	const parsed: unknown = JSON.parse(text)

	if (typeof parsed !== 'object' || parsed === null) throw new Error('состояния нет')

	return Object.fromEntries(Object.entries(parsed))
}

describe('Interactive', () => {
	it('пропсы — в инстанс, смена пропа — в состояние', () => {
		const layer: InteractiveProps = { disabled: true }
		const props = reactiveProps({ setup: setupInteractive, layer })

		mount(Layer, props)

		expect(state()).toMatchObject({ disabled: true, focused: false })

		props.layer = { disabled: false }
		flushSync()

		expect(state()).toMatchObject({ disabled: false })
	})

	it('внешний ctrl — тот же инстанс, его смена доходит до состояния', () => {
		const ctrl = new TInteractive()

		mount(Layer, { setup: setupInteractive, layer: { ctrl } })

		ctrl.disabled = true
		flushSync()

		expect(state()).toMatchObject({ disabled: true })
	})
})

describe('ValueControl', () => {
	it('значение и имя — в инстанс и в состояние', () => {
		const ctrl = new TValueControl<unknown>()

		mount(Layer, { setup: setupValueControl, layer: { ctrl, value: 'a', name: 'pick' } })

		expect(ctrl.value).toBe('a')
		expect(ctrl.name).toBe('pick')
		expect(state()).toMatchObject({ value: 'a', name: 'pick' })

		ctrl.value = 'b'
		flushSync()

		expect(state()).toMatchObject({ value: 'b' })
	})
})

describe('InputControl', () => {
	it('readonly, required и id — в инстанс, снятый проп — к умолчанию', () => {
		const ctrl = new TInputControl<unknown>()
		const layer: InputControlProps = { ctrl, readonly: true, required: true, id: 'field' }
		const props = reactiveProps({ setup: setupInputControl, layer })

		mount(Layer, props)

		expect([ctrl.readonly, ctrl.required, ctrl.id]).toEqual([true, true, 'field'])
		expect(state()).toMatchObject({ readonly: true, required: true, id: 'field' })

		props.layer = { ctrl, required: true }
		flushSync()

		expect([ctrl.readonly, ctrl.id]).toEqual([false, undefined])
		expect(state()).toMatchObject({ readonly: false, required: true })
	})
})

describe('типы пропсов слоёв', () => {
	it('у каждого слоя — свои входы и входы предков', () => {
		expectTypeOf<InteractiveProps>().toHaveProperty('disabled')
		expectTypeOf<InteractiveProps>().toHaveProperty('focused')
		expectTypeOf<ValueControlProps>().toHaveProperty('value')
		expectTypeOf<ValueControlProps>().toHaveProperty('name')
		expectTypeOf<ValueControlProps>().toHaveProperty('size')
		expectTypeOf<InputControlProps>().toHaveProperty('readonly')
		expectTypeOf<InputControlProps>().toHaveProperty('required')
		expectTypeOf<InputControlProps>().toHaveProperty('id')
		expectTypeOf<InputControlProps>().toHaveProperty('value')
	})
})
