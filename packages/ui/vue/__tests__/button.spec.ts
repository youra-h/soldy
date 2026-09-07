import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TButton } from '@soldy/core'
import { TElementPlugin } from '@soldy/plugins'
import { Button } from '@soldy/ui-vue'

/**
 * Button наследует цепочку:
 *   Entity → Component → ComponentView → Stylable → Control → Textable → Button
 *
 * Поэтому тесты покрывают все слои:
 * - Entity: ctrl
 * - Component: rendered, visible, present + события show/hide/change:*
 * - ComponentView: tag, classes + ready
 * - Stylable: size, variant
 * - Control: disabled, focused
 * - Textable: text
 * - Button: view
 */

describe('Button · inline props (декларативные свойства)', () => {
	it('по умолчанию рендерит <button> с базовыми классами', () => {
		const wrapper = mount(Button)

		expect(wrapper.element.tagName.toLowerCase()).toBe('button')

		// ComponentView: tag по умолчанию 'button' (из TButton.defaultValues)
		expect(wrapper.classes()).toEqual(
			expect.arrayContaining([
				's-button',
				's-button--size-normal', // Stylable
				's-button--normal', // Stylable (variant)
				's-button--a-filled', // Button (view)
			]),
		)
	})

	it('отображает text и применяет variant/size/view классы', () => {
		const wrapper = mount(Button, {
			props: { text: 'Hello', variant: 'accent', size: 'xl', view: 'plain' },
		})

		expect(wrapper.find('.s-button__text').text()).toBe('Hello')

		expect(wrapper.classes()).toEqual(
			expect.arrayContaining([
				's-button',
				's-button--size-xl',
				's-button--accent',
				's-button--a-plain',
			]),
		)
		// Старые классы заменены, а не накоплены
		expect(wrapper.classes()).not.toContain('s-button--size-normal')
		expect(wrapper.classes()).not.toContain('s-button--normal')
		expect(wrapper.classes()).not.toContain('s-button--a-filled')
	})

	it('меняет корневой тег через prop tag', () => {
		const link = mount(Button, { props: { tag: 'a' } })
		expect(link.element.tagName.toLowerCase()).toBe('a')
	})

	it('direction прокидывается в атрибут dir, inherit — не ставится', async () => {
		const wrapper = mount(Button, { props: { direction: 'rtl' } })
		expect(wrapper.attributes('dir')).toBe('rtl')

		const plain = mount(Button)
		expect(plain.attributes('dir')).toBeUndefined()

		await wrapper.setProps({ direction: 'inherit' })
		expect(wrapper.attributes('dir')).toBeUndefined()
	})

	it('disabled: атрибут disabled на <button>, aria-disabled на других тегах', () => {
		const btn = mount(Button, { props: { disabled: true } })
		expect(btn.attributes('disabled')).toBeDefined()

		const link = mount(Button, { props: { tag: 'a', disabled: true } })
		expect(link.attributes('aria-disabled')).toBe('true')
		expect(link.attributes('disabled')).toBeUndefined()
	})

	it('rendered=false убирает элемент, visible=false прячет через v-show', async () => {
		const wrapper = mount(Button, { props: { rendered: true, visible: true } })
		expect(wrapper.find('button').exists()).toBe(true)

		await wrapper.setProps({ rendered: false })
		expect(wrapper.find('button').exists()).toBe(false)

		await wrapper.setProps({ rendered: true, visible: false })
		const btn = wrapper.find('button')
		expect(btn.exists()).toBe(true)
		expect(btn.attributes('style')).toContain('display: none')
	})

	it('setProps обновляет DOM и эмитит change:* события', async () => {
		const wrapper = mount(Button, {
			props: { text: 'A', variant: 'normal', size: 'normal', view: 'filled' },
		})

		await wrapper.setProps({ text: 'B', variant: 'accent', size: 'xl', view: 'plain' })

		expect(wrapper.find('.s-button__text').text()).toBe('B')
		expect(wrapper.classes()).toContain('s-button--accent')
		expect(wrapper.classes()).toContain('s-button--size-xl')
		expect(wrapper.classes()).toContain('s-button--a-plain')

		expect(wrapper.emitted('change:text')).toBeTruthy()
		expect(wrapper.emitted('change:variant')).toBeTruthy()
		expect(wrapper.emitted('change:size')).toBeTruthy()
		// TButton эмитит change:view с самим значением
		expect(wrapper.emitted('change:view')!.at(-1)).toEqual(['plain'])
	})

	it('эмитит change:disabled и change:focused', async () => {
		const wrapper = mount(Button, { props: { disabled: false, focused: false } })

		await wrapper.setProps({ disabled: true, focused: true })

		expect(wrapper.attributes('disabled')).toBeDefined()
		expect(wrapper.emitted('change:disabled')).toBeTruthy()
		expect(wrapper.emitted('change:focused')).toBeTruthy()
	})
})

describe('Button · ctrl instance (программные свойства)', () => {
	it('отражает состояние переданного instance', () => {
		const btn = new TButton({
			text: 'FromCtrl',
			variant: 'accent',
			size: 'lg',
			view: 'outlined',
		})

		const wrapper = mount(Button, { props: { ctrl: btn } })

		expect(wrapper.find('.s-button__text').text()).toBe('FromCtrl')
		expect(wrapper.classes()).toContain('s-button--accent')
		expect(wrapper.classes()).toContain('s-button--size-lg')
		expect(wrapper.classes()).toContain('s-button--a-outlined')
	})

	it('мутации instance обновляют компонент и эмитят события', async () => {
		const btn = new TButton({ text: 'X' })
		const wrapper = mount(Button, { props: { ctrl: btn } })

		btn.variant = 'accent'
		await nextTick()
		expect(wrapper.classes()).toContain('s-button--accent')
		expect(wrapper.emitted('change:variant')).toBeTruthy()

		btn.text = 'Y'
		await nextTick()
		expect(wrapper.find('.s-button__text').text()).toBe('Y')
		expect(wrapper.emitted('change:text')).toBeTruthy()

		btn.view = 'plain'
		await nextTick()
		expect(wrapper.classes()).toContain('s-button--a-plain')
		expect(wrapper.emitted('change:view')).toBeTruthy()

		btn.disabled = true
		await nextTick()
		expect(wrapper.attributes('disabled')).toBeDefined()
		expect(wrapper.emitted('change:disabled')).toBeTruthy()
	})

	it('изменение tag через instance меняет корневой элемент', async () => {
		const btn = new TButton()
		const wrapper = mount(Button, { props: { ctrl: btn } })

		expect(wrapper.element.tagName.toLowerCase()).toBe('button')

		btn.tag = 'span'
		await nextTick()

		expect(wrapper.element.tagName.toLowerCase()).toBe('span')
	})
})

describe('Button · события видимости и готовности', () => {
	it('hide/show через instance эмитит события и управляет v-show', async () => {
		const btn = new TButton()
		const wrapper = mount(Button, { props: { ctrl: btn } })

		btn.hide()
		await nextTick()

		expect(wrapper.emitted('hide:before')).toBeTruthy()
		expect(wrapper.emitted('hide')).toBeTruthy()
		expect(wrapper.emitted('hide:after')).toBeTruthy()
		expect(wrapper.emitted('change:visible')).toBeTruthy()
		expect(wrapper.find('button').attributes('style')).toContain('display: none')

		btn.show()
		await nextTick()

		expect(wrapper.emitted('show:before')).toBeTruthy()
		expect(wrapper.emitted('show')).toBeTruthy()
		expect(wrapper.emitted('show:after')).toBeTruthy()
		expect(wrapper.find('button').attributes('style')).not.toContain('display: none')
	})

	it('ready через instance эмитит событие ready', async () => {
		const btn = new TButton()
		const wrapper = mount(Button, { props: { ctrl: btn } })

		btn.ready = true
		await nextTick()

		expect(wrapper.emitted('ready')).toBeTruthy()
	})
})

/** createBundle откладывает эмит на микрозадачу — см. define-component.ts */
const created = () => Promise.resolve()

describe('Button · доступ к плагинам', () => {
	it('@bundle:create отдаёт bundle в шаблон', async () => {
		const seen: any[] = []

		mount(Button, { props: { 'onBundle:create': (b: unknown) => seen.push(b) } })

		await created()

		expect(seen).toHaveLength(1)
		expect(seen[0].get(TElementPlugin)).toBeInstanceOf(TElementPlugin)
	})

	it('@element:create отдаёт сам плагин, минуя bundle', async () => {
		const seen: any[] = []

		mount(Button, { props: { 'onElement:create': (p: unknown) => seen.push(p) } })

		await created()

		expect(seen).toHaveLength(1)
		expect(seen[0]).toBeInstanceOf(TElementPlugin)
	})

	it('плагин из create — тот же, что связан с DOM-узлом компонента', async () => {
		let plugin: any = null

		const wrapper = mount(Button, {
			props: { 'onElement:create': (p: unknown) => (plugin = p) },
		})

		await nextTick()

		// Доказательство, что это рабочий плагин, а не отдельный экземпляр
		expect(plugin.element).toBe(wrapper.element)
	})
})

describe('Button · aria из ядра', () => {
	it('на нативной кнопке лишних атрибутов нет', () => {
		const wrapper = mount(Button, { props: { disabled: true } })

		expect(wrapper.attributes('disabled')).toBeDefined()
		expect(wrapper.attributes('role')).toBeUndefined()
		expect(wrapper.attributes('tabindex')).toBeUndefined()
		expect(wrapper.attributes('aria-disabled')).toBeUndefined()
	})

	it('на не-нативном теге появляются role, tabindex и aria-disabled', () => {
		const wrapper = mount(Button, { props: { tag: 'div', disabled: true } })

		expect(wrapper.attributes('role')).toBe('button')
		expect(wrapper.attributes('aria-disabled')).toBe('true')
		// disabled выключает элемент из порядка обхода
		expect(wrapper.attributes('tabindex')).toBeUndefined()
	})

	it('без disabled не-нативная кнопка фокусируема', () => {
		const wrapper = mount(Button, { props: { tag: 'div' } })

		expect(wrapper.attributes('tabindex')).toBe('0')
	})

	it('атрибуты пересчитываются при смене tag', async () => {
		const wrapper = mount(Button, { props: { tag: 'div' } })

		expect(wrapper.attributes('role')).toBe('button')

		await wrapper.setProps({ tag: 'button' })

		expect(wrapper.attributes('role')).toBeUndefined()
		expect(wrapper.attributes('tabindex')).toBeUndefined()
	})
})
