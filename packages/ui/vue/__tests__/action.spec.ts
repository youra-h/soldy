/**
 * TActionPlugin — взаимодействие контрола с пользователем.
 *
 * Проверяется через Vue-адаптер: нужен настоящий DOM и обе стороны управления —
 * шаблонная (`@action:press`) и инстансная (`ctrl.events`).
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { TButton } from '@soldy/core'
import { TActionPlugin, TPluginBundle } from '@soldy/plugins'
import { Accordion, AccordionItem, Button, CheckBox, Input, Tabs, TabsItem } from '@soldy/ui-vue'

/**
 * Плагин цепляет слушатели по `element:ready`, а TElementPlugin отдаёт его
 * через requestAnimationFrame — значит до следующего кадра слушателей нет.
 */
const mounted = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Клавиши активации: имя для заголовка теста и `key` события. */
const KEYS = [
	['Enter', 'Enter'],
	['пробел', ' '],
] as const

/**
 * keydown, как его шлёт браузер: всплывает и отменяется. Без `cancelable`
 * `preventDefault()` ничего не делает, и `defaultPrevented` не прочитать.
 */
const keydown = (target: Element, key: string): KeyboardEvent => {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	target.dispatchEvent(event)

	return event
}

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

	/**
	 * Фокус на самом корне-`div` (`role="button"`, `tabindex="0"`): клик из
	 * клавиши браузер тут не сделает, его заменяет `press`. Действие браузера
	 * отменено — пробел иначе прокрутил бы страницу.
	 */
	it.each(KEYS)(
		'%s на корне не-нативного тега — press, действие браузера отменено',
		async (_name, key) => {
			const press = vi.fn()
			const wrapper = mount(Button, { props: { tag: 'div', 'onAction:press': press } })

			await mounted()

			const event = keydown(wrapper.element, key)

			expect(press).toHaveBeenCalledTimes(1)
			expect(event.defaultPrevented).toBe(true)
		},
	)

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

describe('press · Enter и пробел из вложенного элемента', () => {
	/**
	 * Корень нормализует активацию, только когда фокус на нём самом. Поле,
	 * чекбокс и кнопка под корнем-`div` знают, что делать с Enter и пробелом,
	 * сами; их клик и так всплывёт в корень и даст `press`. Раньше корень
	 * отменял и эти клавиши: в Input не печатался пробел, CheckBox не
	 * переключался, заголовок Accordion и таб не нажимались.
	 *
	 * jsdom действий браузера не выполняет, поэтому здесь только то, что
	 * корень клавишу не отменил и не выдал за свой `press`. Сами действия
	 * проверяет `playground/vue/browser/keyboard-activation.spec.ts`.
	 */
	const NESTED = {
		'поля Input': { template: '<Input @action:press="press" />', target: 'input' },
		'чекбокса CheckBox': { template: '<CheckBox @action:press="press" />', target: 'input' },
		'заголовка секции Accordion': {
			template: `
				<Accordion @action:press="press">
					<AccordionItem value="a" text="A" @action:press="press" />
				</Accordion>
			`,
			target: '.s-accordion-item__header',
		},
		'неактивного таба': {
			template: `
				<Tabs @action:press="press">
					<TabsItem value="a" text="A" active @action:press="press" />
					<TabsItem value="b" text="B" @action:press="press" />
				</Tabs>
			`,
			target: '[role="tab"][aria-selected="false"]',
		},
	}

	let wrapper: ReturnType<typeof mount> | null = null

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
	})

	describe.each(Object.entries(NESTED))('из %s', (_name, { template, target }) => {
		it.each(KEYS)('%s — корень не отменяет клавишу и не даёт press', async (_key, key) => {
			const press = vi.fn()

			// `press` слушают все корни-`div` на пути клавиши
			wrapper = mount({
				components: { Accordion, AccordionItem, CheckBox, Input, Tabs, TabsItem },
				setup: () => ({ press }),
				template,
			})

			await mounted()

			const event = keydown(wrapper.get(target).element, key)

			expect(event.defaultPrevented).toBe(false)
			expect(press).not.toHaveBeenCalled()
		})
	})
})

describe('смена корня · tag на лету', () => {
	/**
	 * Смена `tag` пересоздаёт корень, и `watch` адаптера видит сразу новый узел,
	 * без промежуточного `null`. Слушатели обязаны переехать на новый корень:
	 * `TElementPlugin` шлёт `removed` для старого узла и `ready` для нового.
	 */
	it('после смены tag клик по новому корню даёт ровно один press', async () => {
		const press = vi.fn()
		const wrapper = mount(Button, { props: { 'onAction:press': press } })

		await mounted()
		await wrapper.setProps({ tag: 'div' })
		await mounted()
		await wrapper.trigger('click')

		expect(press).toHaveBeenCalledTimes(1)
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

describe('доступ к плагину', () => {
	it('@action:create отдаёт плагин, через него — подписка на press', async () => {
		const press = vi.fn()

		const wrapper = mount(Button, {
			props: {
				'onAction:create': (plugin: unknown) => {
					if (plugin instanceof TActionPlugin) plugin.events.on('press', press)
				},
			},
		})

		await mounted()
		await wrapper.trigger('click')

		expect(press).toHaveBeenCalledTimes(1)
	})

	it('со стороны инстанса — через bundle:create, без единого упоминания шаблона', async () => {
		const ctrl = new TButton()
		const press = vi.fn()

		ctrl.events.on('bundle:create', (bundle: unknown) => {
			if (bundle instanceof TPluginBundle)
				bundle.get(TActionPlugin)?.events.on('press', press)
		})

		const wrapper = mount(Button, { props: { ctrl } })

		await mounted()
		await wrapper.trigger('click')

		expect(press).toHaveBeenCalledTimes(1)
	})
})
