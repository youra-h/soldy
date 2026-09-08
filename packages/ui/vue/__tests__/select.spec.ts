/**
 * Select в разметке — проверка проводки целиком.
 *
 * Юнит-тесты ядра и плагинов проверяют механизмы по отдельности; здесь важно,
 * что они сходятся: опции регистрируются через элеватор, панель телепортируется
 * и остаётся связанной с полем, ARIA собирается в один набор.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

/**
 * `TElementPlugin` отдаёт элемент через `requestAnimationFrame`, поэтому
 * плагины, которым нужен DOM-узел, включаются кадром позже. Ждём кадр.
 */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
import { Select, SelectItem } from '@soldy/ui-vue'
import Harness from './Select.test.vue'

/**
 * Панель телепортируется в body, поэтому размонтировать обёртку обязательно:
 * иначе панели предыдущих тестов остаются в документе и следующий видит
 * чужие опции.
 */
let wrapper: ReturnType<typeof mount> | null = null

const render = (props: Record<string, unknown> = {}) => {
	wrapper = mount(Harness, { props, attachTo: document.body })

	return wrapper
}

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Панель телепортируется в body, поэтому ищем её по документу. */
const panel = () => document.querySelector('[role="listbox"]')

/** Открыта ли панель. Она всегда в DOM — скрывается через display: none. */
const isOpen = () => {
	const frame = document.querySelector('.s-select__panel') as HTMLElement | null

	return !!frame && frame.style.display !== 'none'
}
const options = () => [...document.querySelectorAll('[role="option"]')]

describe('составной компонент', () => {
	it('Select.Item === SelectItem', () => {
		expect(Select.Item).toBe(SelectItem)
	})
})

describe('поле', () => {
	it('объявлено как combobox и свёрнуто', () => {
		const field = render().find('input')

		expect(field.attributes('role')).toBe('combobox')
		expect(field.attributes('aria-expanded')).toBe('false')
		expect(field.attributes('aria-haspopup')).toBe('listbox')
	})

	it('пока закрыто, панель скрыта — но остаётся в документе', () => {
		// Убери её через v-if — и закрытие вычистило бы опции из коллекции,
		// а вместе с ними значение поля
		render()

		expect(panel()).not.toBeNull()
		expect(isOpen()).toBe(false)
	})

	it('клик открывает панель', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		await nextTick()

		expect(wrapper.find('input').attributes('aria-expanded')).toBe('true')
		expect(isOpen()).toBe(true)
	})

	it('ссылается на список — и список этот id носит', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(wrapper.find('input').attributes('aria-controls')).toBe(panel()!.id)
	})
})

describe('опции', () => {
	it('попадают в коллекцию через элеватор и получают роль', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(options()).toHaveLength(3)
	})

	it('aria-selected стоит на всех, а не только на выбранной', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(options().every((o) => o.hasAttribute('aria-selected'))).toBe(true)
	})

	it('клик по опции выбирает её и закрывает панель', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		;(options()[1] as HTMLElement).click()
		await nextTick()

		expect(wrapper.find('input').element.value).toBe('Тверь')
		expect(wrapper.find('input').attributes('aria-expanded')).toBe('false')
	})

	it('состояние для темы идёт через data-*, а не через aria', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		;(options()[0] as HTMLElement).click()
		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(options()[0].getAttribute('data-selected')).toBe('true')
		expect(options()[1].getAttribute('data-selected')).toBe('false')
	})
})

describe('кнопка очистки', () => {
	it('без clearable её нет', () => {
		expect(render().find('.s-select__clear').exists()).toBe(false)
	})

	it('имя собрано с именем поля', () => {
		const clear = render({ clearable: true }).find('.s-select__clear')

		expect(clear.attributes('aria-label')).toBe('Clear Город')
	})
})

describe('множественный выбор', () => {
	it('список помечен как multiselectable', async () => {
		const wrapper = render({ mode: 'multiple' })

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(panel()!.getAttribute('aria-multiselectable')).toBe('true')
	})

	it('в одиночном режиме пометки нет', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(panel()!.hasAttribute('aria-multiselectable')).toBe(false)
	})
})

describe('панель как телепортированный Frame', () => {
	it('класс и data-* доезжают до узла, а не теряются в телепорте', async () => {
		// Корень шаблона Frame — <teleport>, и Vue считает корневым узлом его.
		// Без ручного переноса атрибутов сюда не доходили ни класс, ни метка
		// владельца, по которой dismiss отличает нажатие внутрь панели
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		const frame = document.querySelector('.s-select__panel')

		expect(frame).not.toBeNull()
		expect(frame!.hasAttribute('data-owner')).toBe(true)
	})

	it('нажатие внутрь панели её не закрывает', async () => {
		// Панель вне поддерева владельца, поэтому одного contains() мало —
		// её метка владельца и есть вторая граница
		const wrapper = render()

		await wrapper.find('.s-select').trigger('click')
		await nextTick()
		await nextTick()

		await nextFrame()

		const option = document.querySelector('[role="option"]')!

		option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await nextTick()

		expect(isOpen()).toBe(true)
	})

	it('нажатие мимо закрывает', async () => {
		const wrapper = render()

		await wrapper.find('.s-select').trigger('click')
		await nextTick()
		await nextTick()

		await nextFrame()

		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await nextTick()
		await nextTick()

		expect(isOpen()).toBe(false)
	})
})
