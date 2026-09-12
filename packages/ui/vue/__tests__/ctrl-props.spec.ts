/**
 * Пропы из разметки при внешнем `ctrl`.
 *
 * Свой инстанс передают, чтобы держать состояние снаружи, — но разметка при
 * этом остаётся разметкой: `<Select :ctrl="x" placeholder="Выберите">` обязан
 * показать плейсхолдер. Не показывал: инстанс компонент строит из props сам и
 * стартовые значения получает в конструкторе, а чужому не доставалось ничего —
 * `watch` в `useSyncProps` молчит, пока проп не сменится.
 *
 * Обратная сторона так же важна: то, чего в разметке нет, инстансу не
 * навязывается. У пропа ядра `default` берётся из `defaultValues`, и запись
 * «всех props подряд» затирала бы чужое состояние умолчаниями — ровно то, ради
 * чего инстанс и передают.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TInput, TSelect } from '@soldy/core'
import { Input, Select } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

async function render(component: unknown, props: Record<string, unknown>) {
	wrapper = mount(component as never, { props: props as never, attachTo: document.body })

	await nextTick()

	return wrapper
}

describe('написанное в разметке доезжает до чужого инстанса', () => {
	it('Input: placeholder', async () => {
		const ctrl = new TInput()
		const w = await render(Input, { ctrl, placeholder: 'Введите текст' })

		expect((ctrl as { placeholder: string }).placeholder).toBe('Введите текст')
		expect(w.find('input').attributes('placeholder')).toBe('Введите текст')
	})

	it('Select: placeholder и editable', async () => {
		const ctrl = new TSelect()
		const w = await render(Select, { ctrl, placeholder: 'Выберите', editable: true })

		expect((ctrl as { editable: boolean }).editable).toBe(true)
		// `editable` снимает `readonly` — без него в поле не поставить курсор
		expect((ctrl as { readonly: boolean }).readonly).toBe(false)
		expect(w.find('input').attributes('readonly')).toBeUndefined()
		expect(w.find('input').attributes('placeholder')).toBe('Выберите')
	})

	it('проп, написанный через дефис', async () => {
		const ctrl = new TSelect()

		await render(Select, { ctrl, 'editable-mode': 'filter' })

		expect((ctrl as { editableMode: string }).editableMode).toBe('filter')
	})

	it('дальнейшие смены пропа работают как раньше', async () => {
		const ctrl = new TSelect()
		const w = await render(Select, { ctrl, placeholder: 'Первый' })

		await w.setProps({ placeholder: 'Второй' } as never)

		expect((ctrl as { placeholder: string }).placeholder).toBe('Второй')
	})
})

describe('ненаписанное — не трогается', () => {
	it('умолчания разметки не затирают состояние инстанса', async () => {
		const ctrl = new TSelect({ editable: true, placeholder: 'Своё' } as never)

		await render(Select, { ctrl })

		expect((ctrl as { editable: boolean }).editable).toBe(true)
		expect((ctrl as { placeholder: string }).placeholder).toBe('Своё')
	})
})
