/**
 * Пропы из разметки при внешнем `ctrl`.
 *
 * Свой инстанс передают, чтобы держать состояние снаружи, — но разметка при
 * этом остаётся разметкой: `<Select :ctrl="x" placeholder="Выберите">` обязан
 * показать плейсхолдер. Не показывал: инстанс компонент строит из props сам и
 * стартовые значения получает в конструкторе, а чужому не доставалось ничего —
 * `watch` в `useAdapterParts` молчит, пока проп не сменится.
 *
 * Обратная сторона так же важна: то, чего в разметке нет, инстансу не
 * навязывается. `default` пропа приходит из декларации (у пропа ядра — из
 * `defaultValues` класса), и запись «всех props подряд» затирала бы чужое
 * состояние умолчаниями — ровно то, ради чего инстанс и передают.
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

describe('написанное в разметке доезжает до чужого инстанса', () => {
	it('Input: placeholder', async () => {
		const ctrl = new TInput()
		wrapper = mount(Input, {
			props: { ctrl, placeholder: 'Введите текст' },
			attachTo: document.body,
		})
		await nextTick()

		expect(ctrl.placeholder).toBe('Введите текст')
		expect(wrapper.find('input').attributes('placeholder')).toBe('Введите текст')
	})

	it('Select: placeholder и editable', async () => {
		const ctrl = new TSelect()
		wrapper = mount(Select, {
			props: { ctrl, placeholder: 'Выберите', editable: true },
			attachTo: document.body,
		})
		await nextTick()

		expect(ctrl.editable).toBe(true)
		// `editable` снимает `readonly` — без него в поле не поставить курсор
		expect(ctrl.readonly).toBe(false)
		expect(wrapper.find('input').attributes('readonly')).toBeUndefined()
		expect(wrapper.find('input').attributes('placeholder')).toBe('Выберите')
	})

	it('проп, написанный через дефис', async () => {
		const ctrl = new TSelect()

		wrapper = mount(Select, {
			props: { ctrl, 'editable-mode': 'filter' },
			attachTo: document.body,
		})
		await nextTick()

		expect(ctrl.editableMode).toBe('filter')
	})

	it('дальнейшие смены пропа работают как раньше', async () => {
		const ctrl = new TSelect()
		wrapper = mount(Select, { props: { ctrl, placeholder: 'Первый' }, attachTo: document.body })
		await nextTick()

		await wrapper.setProps({ placeholder: 'Второй' })

		expect(ctrl.placeholder).toBe('Второй')
	})
})

describe('ненаписанное — не трогается', () => {
	it('умолчания разметки не затирают состояние инстанса', async () => {
		const ctrl = new TSelect({ editable: true, placeholder: 'Своё' })

		wrapper = mount(Select, { props: { ctrl }, attachTo: document.body })
		await nextTick()

		expect(ctrl.editable).toBe(true)
		expect(ctrl.placeholder).toBe('Своё')
	})
})
