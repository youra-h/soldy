/**
 * Кнопка очистки Input — часть поля, а не владельца: её рисует сам Input,
 * Select только отдаёт полю `clearable`.
 *
 * Здесь — проводка: кнопка по `clearable`, первой в обёртке у конца поля,
 * перед содержимым `trailing`, с именем от ядра (`clearAria`, строка словаря
 * приложения с именем поля); клик очищает поле командой ядра `clear` и до
 * предков не всплывает; своя кнопка — слот `clear` с командой в scope. Что
 * очистка делает с моделью, проверяет ядро (`core/__tests__/input.spec.ts`),
 * форму кнопки — браузерный прогон (`playground/vue/browser/input.spec.ts`).
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick, type VNode } from 'vue'
import { TInput } from '@soldy-ui/core'
import { useTranslations } from '@soldy-ui/plugins'
import { Input } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Слот поля. Из scope тесту нужна только команда очистки слота `clear`. */
type TSlot = (scope: { clear: () => void }) => VNode

const render = (props: Record<string, unknown> = {}, slots: Record<string, TSlot> = {}) => {
	wrapper = mount(Input, { props, slots, attachTo: document.body })

	return wrapper
}

describe('Input · кнопка очистки', () => {
	it('без clearable кнопки нет, и обёртки у конца поля тоже', () => {
		const input = render({ value: 'текст' })

		expect(input.find('.s-input__clear').exists()).toBe(false)
		expect(input.find('.s-input__trailing').exists()).toBe(false)
	})

	it('по clearable — первой в обёртке у конца, перед содержимым trailing', () => {
		const input = render(
			{ clearable: true, name: 'Город' },
			{ trailing: () => h('i', { class: 'probe-trailing' }) },
		)
		const slot = input.find('.s-input__trailing')
		const parts = ['.s-input__clear', '.probe-trailing']

		expect(
			[...slot.element.children].map((node) => parts.find((part) => node.matches(part))),
		).toEqual(parts)
		expect(input.classes()).toContain('s-input--clearable')
	})

	it('имя собрано с именем поля, строку задаёт словарь приложения', async () => {
		const input = render({ clearable: true, name: 'Город' })

		expect(input.find('.s-input__clear').attributes('aria-label')).toBe('Clear Город')

		useTranslations({ field: { clear: (name) => `Очистить ${name}` } })
		await nextTick()

		expect(input.find('.s-input__clear').attributes('aria-label')).toBe('Очистить Город')
	})

	it('размер — поля, выключена — вместе с полем, readonly её не гасит', async () => {
		const input = render({ clearable: true, size: 'lg', readonly: true })
		const button = () => input.find('.s-input__clear')

		expect(button().classes()).toContain('s-button--size-lg')
		expect(button().attributes('disabled')).toBeUndefined()

		await input.setProps({ disabled: true })

		expect(button().attributes('disabled')).toBeDefined()
	})

	it('клик очищает поле и до предка не всплывает', async () => {
		const parentClick = vi.fn()

		wrapper = mount(
			{
				render: () =>
					h('div', { onClick: parentClick }, [
						h(Input, { clearable: true, value: 'текст' }),
					]),
			},
			{ attachTo: document.body },
		)

		const input = wrapper.findComponent(Input)

		await wrapper.find('.s-input__clear').trigger('click')
		await nextTick()

		expect(wrapper.find('input').element.value).toBe('')
		expect(input.emitted('update:value')?.at(-1)).toEqual([''])
		expect(parentClick).not.toHaveBeenCalled()
	})

	it('кнопка зовёт команду ядра — clear приходит и у пустого поля', async () => {
		const ctrl = new TInput({ value: '' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)
		render({ ctrl, clearable: true })

		await wrapper?.find('.s-input__clear').trigger('click')

		expect(clear).toHaveBeenCalledTimes(1)
	})

	/**
	 * Своя кнопка заменяет встроенную целиком и рисуется, когда задана, — без
	 * `clearable`. Команду очистки она берёт из scope и зовёт голой функцией.
	 */
	it('своя кнопка — слот clear с командой очистки в scope', async () => {
		const input = render(
			{ value: 'текст' },
			{
				clear: ({ clear }: { clear: () => void }) =>
					h('button', { class: 'probe-clear', onClick: () => clear() }),
			},
		)

		expect(input.find('.s-input__trailing > .probe-clear').exists()).toBe(true)
		expect(input.find('.s-input__clear').exists()).toBe(false)

		await input.find('.probe-clear').trigger('click')
		await nextTick()

		expect(input.find('input').element.value).toBe('')
	})

	it('своя кнопка при clearable — вместо встроенной', () => {
		const input = render(
			{ clearable: true },
			{ clear: () => h('button', { class: 'probe-clear' }) },
		)

		expect(input.find('.probe-clear').exists()).toBe(true)
		expect(input.find('.s-input__clear').exists()).toBe(false)
	})
})
