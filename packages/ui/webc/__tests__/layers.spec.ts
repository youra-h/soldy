/**
 * Слои без своей разметки — Interactive, ValueControl, InputControl: сборка
 * своей setup-функцией по своему дескриптору.
 *
 * Элемента у слоя нет — его setup-функцию зовёт база элемента наследника, —
 * поэтому проверяется сама связка над хостом, как её получает база: пропсы
 * первой сборки доходят до инстанса, внешний `ctrl` — тот самый инстанс, его
 * смена доходит до состояния и колбэка `onUpdate`, запись в связку (`syncProps`)
 * — до инстанса, снятый проп возвращается к умолчанию, а уничтоженная связка
 * больше ничего не сообщает. Сценарии — те же, что у Svelte (`layers.spec.ts`).
 */

import { describe, it, expect } from 'vitest'
import { TInputControl, TInteractive, TValueControl } from '@soldy-ui/core'
import { setupInputControl, setupInteractive, setupValueControl } from '@soldy-ui/webc'

/** Колбэк связки, который запоминает, о каких пропах она сообщила. */
function recorder(): { readonly names: string[]; onUpdate: (name: string) => void } {
	const names: string[] = []

	return { names, onUpdate: (name) => names.push(name) }
}

describe('Interactive', () => {
	it('пропсы — в инстанс и состояние, запись в связку — тоже', () => {
		const host = document.createElement('div')
		const { names, onUpdate } = recorder()
		const binding = setupInteractive(host, undefined, { disabled: true }, onUpdate)

		expect(binding.ctrl).toBeInstanceOf(TInteractive)
		expect(binding.ctrl.disabled).toBe(true)
		expect(binding.state).toMatchObject({ disabled: true, focused: false })

		names.length = 0
		binding.syncProps({ disabled: false })

		expect(binding.ctrl.disabled).toBe(false)
		expect(binding.state).toMatchObject({ disabled: false })
		expect(names).toContain('disabled')

		binding.destroy()
	})

	it('внешний ctrl — тот же инстанс, его смена доходит до состояния', () => {
		const host = document.createElement('div')
		const ctrl = new TInteractive()
		const { names, onUpdate } = recorder()
		const binding = setupInteractive(host, ctrl, {}, onUpdate)

		expect(binding.ctrl).toBe(ctrl)

		names.length = 0
		ctrl.disabled = true

		expect(binding.state).toMatchObject({ disabled: true })
		expect(names).toContain('disabled')

		binding.destroy()
	})

	it('уничтоженная связка о смене инстанса больше не сообщает', () => {
		const host = document.createElement('div')
		const ctrl = new TInteractive()
		const { names, onUpdate } = recorder()
		const binding = setupInteractive(host, ctrl, {}, onUpdate)

		binding.destroy()
		names.length = 0
		ctrl.disabled = true

		expect(names).toEqual([])
	})
})

describe('ValueControl', () => {
	it('значение и имя — в инстанс и в состояние, смена инстанса — тоже', () => {
		const host = document.createElement('div')
		const ctrl = new TValueControl<unknown>()
		const binding = setupValueControl(host, ctrl, { value: 'a', name: 'pick' }, () => {})

		expect(ctrl.value).toBe('a')
		expect(ctrl.name).toBe('pick')
		expect(binding.state).toMatchObject({ value: 'a', name: 'pick' })

		ctrl.value = 'b'

		expect(binding.state).toMatchObject({ value: 'b' })

		binding.destroy()
	})
})

describe('InputControl', () => {
	it('readonly, required и id — в инстанс, снятый проп — к умолчанию', () => {
		const host = document.createElement('div')
		const ctrl = new TInputControl<unknown>()
		const binding = setupInputControl(
			host,
			ctrl,
			{ readonly: true, required: true, id: 'field' },
			() => {},
		)

		expect([ctrl.readonly, ctrl.required, ctrl.id]).toEqual([true, true, 'field'])
		expect(binding.state).toMatchObject({ readonly: true, required: true, id: 'field' })

		binding.syncProps({ readonly: undefined, id: undefined })

		expect([ctrl.readonly, ctrl.required, ctrl.id]).toEqual([false, true, undefined])
		expect(binding.state).toMatchObject({ readonly: false, required: true })

		binding.destroy()
	})
})
