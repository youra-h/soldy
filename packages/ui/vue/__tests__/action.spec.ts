/**
 * TActionPlugin — взаимодействие контрола с пользователем.
 *
 * Проверяется через Vue-адаптер: нужен настоящий DOM и обе стороны управления —
 * шаблонная (`@action:press`) и инстансная (`ctrl.events`).
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { TButton, TInput } from '@soldy/core'
import { TActionPlugin } from '@soldy/plugins'
import { Button, Input } from '@soldy/ui-vue'

/**
 * Плагин цепляет слушатели по `element:ready`, а TElementPlugin отдаёт его
 * через requestAnimationFrame — значит до следующего кадра слушателей нет.
 */
const mounted = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

describe('press · нормализованная активация', () => {
	it('приходит на клик мышью', async () => {
		const press = vi.fn()
		const wrapper = mount(Button, { props: { 'onAction:press': press } })

		await mounted()
		await wrapper.trigger('click')

		expect(press).toHaveBeenCalledTimes(1)
	})

	it('не приходит на disabled, а сырой click — приходит', async () => {
		const press = vi.fn()
		const click = vi.fn()

		// tag=div: нативная <button disabled> клик вообще не отдаёт, и разница
		// между press и click была бы не видна
		const wrapper = mount(Button, {
			props: { tag: 'div', disabled: true, 'onAction:press': press, 'onAction:click': click },
		})

		await mounted()
		await wrapper.trigger('click')

		expect(click).toHaveBeenCalledTimes(1)
		expect(press).not.toHaveBeenCalled()
	})

	it('Enter активирует не-нативный тег', async () => {
		const press = vi.fn()
		const wrapper = mount(Button, { props: { tag: 'div', 'onAction:press': press } })

		await mounted()
		await wrapper.trigger('keydown', { key: 'Enter' })

		expect(press).toHaveBeenCalledTimes(1)
	})

	it('на нативной кнопке Enter не даёт второго press', async () => {
		const press = vi.fn()
		const wrapper = mount(Button, { props: { 'onAction:press': press } })

		await mounted()
		// Браузер сам превратит это в click; обработай плагин ещё и keydown,
		// потребитель получил бы два press на одно нажатие
		await wrapper.trigger('keydown', { key: 'Enter' })

		expect(press).not.toHaveBeenCalled()
	})
})

describe('focused · связь с настоящим фокусом', () => {
	it('DOM-фокус пишется в инстанс', async () => {
		const ctrl = new TButton()
		const wrapper = mount(Button, { props: { ctrl }, attachTo: document.body })

		await mounted()
		expect(ctrl.focused).toBe(false)
		;(wrapper.element as HTMLElement).focus()

		expect(ctrl.focused).toBe(true)
	})

	it('запись в инстанс двигает DOM-фокус', async () => {
		const ctrl = new TButton()
		const wrapper = mount(Button, { props: { ctrl }, attachTo: document.body })

		await mounted()

		ctrl.focused = true

		expect(document.activeElement).toBe(wrapper.element)
	})

	it('не зацикливается: focusin → focused → focus() → focusin', async () => {
		const ctrl = new TButton()
		const changes: boolean[] = []

		ctrl.events.on('change:focused', (value: boolean) => changes.push(value))

		const wrapper = mount(Button, { props: { ctrl }, attachTo: document.body })

		await mounted()
		;(wrapper.element as HTMLElement).focus()

		expect(changes).toEqual([true])
	})
})

describe('data-focus-visible · Input (баг: кольцо по клику)', () => {
	/**
	 * `<input>` матчит браузерный `:focus-visible` при любом фокусе, включая
	 * клик — спека считает текстовое поле «ожидающим клавиатуру». Тема больше
	 * не полагается на эту эвристику и красит только по `data-focus-visible`,
	 * которую считает `TActionPlugin` через модальность последнего ввода.
	 */
	it('Tab (клавиатура) перед фокусом ставит data-focus-visible на корень', async () => {
		const ctrl = new TInput()
		const wrapper = mount(Input, { props: { ctrl }, attachTo: document.body })

		await mounted()

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
		await wrapper.find('input').trigger('focusin')

		expect(wrapper.attributes('data-focus-visible')).toBe('true')
	})

	it('клик мышью перед фокусом не ставит data-focus-visible', async () => {
		const ctrl = new TInput()
		const wrapper = mount(Input, { props: { ctrl }, attachTo: document.body })

		await mounted()

		document.dispatchEvent(new PointerEvent('pointerdown'))
		await wrapper.find('input').trigger('focusin')

		expect(wrapper.attributes('data-focus-visible')).toBeUndefined()
	})

	it('focusout снимает data-focus-visible', async () => {
		const ctrl = new TInput()
		const wrapper = mount(Input, { props: { ctrl }, attachTo: document.body })

		await mounted()

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
		await wrapper.find('input').trigger('focusin')
		expect(wrapper.attributes('data-focus-visible')).toBe('true')

		await wrapper.find('input').trigger('focusout')

		expect(wrapper.attributes('data-focus-visible')).toBeUndefined()
	})
})

describe('доступ к плагину', () => {
	it('@action:create отдаёт плагин, через него — подписка на press', async () => {
		const press = vi.fn()

		const wrapper = mount(Button, {
			props: { 'onAction:create': (plugin: any) => plugin.events.on('press', press) },
		})

		await mounted()
		await wrapper.trigger('click')

		expect(press).toHaveBeenCalledTimes(1)
	})

	it('со стороны инстанса — через bundle:create, без единого упоминания шаблона', async () => {
		const ctrl = new TButton()
		const press = vi.fn()

		ctrl.events.on('bundle:create', (bundle: any) => {
			bundle.get(TActionPlugin).events.on('press', press)
		})

		const wrapper = mount(Button, { props: { ctrl } })

		await mounted()
		await wrapper.trigger('click')

		expect(press).toHaveBeenCalledTimes(1)
	})
})
