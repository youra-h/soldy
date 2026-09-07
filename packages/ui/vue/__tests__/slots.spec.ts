/**
 * Слоты: соответствие контракту и поведение.
 *
 * Contract conformance — главная цель всей затеи: слоты объявлены один раз в
 * дескрипторе, и все адаптеры обязаны реализовать ровно их. Здесь проверяется
 * Vue; остальные адаптеры проверяют себя в своих пакетах.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { ButtonDescriptor, ComponentViewDescriptor } from '@soldy/setup'
import { Button, ComponentView } from '@soldy/ui-vue'

/** Имена слотов, реально объявленные в разметке .vue-файла. */
function templateSlots(relativePath: string): string[] {
	const source = readFileSync(resolve(import.meta.dirname, '..', relativePath), 'utf8')
	const names = new Set<string>()

	for (const match of source.matchAll(/<slot\b([^>]*)>/g)) {
		const name = /\bname="([^"]+)"/.exec(match[1])

		names.add(name ? name[1] : 'default')
	}

	return [...names].sort()
}

describe('соответствие контракту', () => {
	it('Button: разметка объявляет ровно слоты дескриптора', () => {
		expect(templateSlots('src/components/button/Button.vue')).toEqual(
			ButtonDescriptor()
				.getSlots()
				.map((slot) => slot.name)
				.sort(),
		)
	})

	it('ComponentView: то же для одного слота по умолчанию', () => {
		expect(templateSlots('src/components/component-view/ComponentView.vue')).toEqual(
			ComponentViewDescriptor()
				.getSlots()
				.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('поведение слотов Button', () => {
	it('leading ставится перед текстом, trailing — после', () => {
		const wrapper = mount(Button, {
			props: { text: 'Mid' },
			slots: { leading: '<i>L</i>', trailing: '<i>T</i>' },
		})

		expect(wrapper.element.textContent).toBe('LMidT')
	})

	it('содержимое default переопределяет text', () => {
		const wrapper = mount(Button, {
			props: { text: 'ignored' },
			slots: { default: '<b>Custom</b>' },
		})

		expect(wrapper.find('.s-button__text').text()).toBe('Custom')
	})

	it('слот default получает scope с text', () => {
		const wrapper = mount(Button, {
			props: { text: 'Scoped' },
			slots: { default: '<template #default="{ text }"><b>{{ text }}!</b></template>' },
		})

		expect(wrapper.find('.s-button__text').text()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const wrapper = mount(Button, { props: { text: 'Fallback' } })

		expect(wrapper.find('.s-button__text').text()).toBe('Fallback')
	})
})

describe('поведение слотов ComponentView', () => {
	it('содержимое попадает в корень', () => {
		const wrapper = mount(ComponentView, { slots: { default: '<b>Inner</b>' } })

		expect(wrapper.find('b').text()).toBe('Inner')
	})
})

describe('слот не ограничивает содержимое', () => {
	/**
	 * `scope` в объявлении слота — данные, которые компонент передаёт ВНУТРЬ
	 * (`v-slot="{ text }"`), а не тип содержимого. Положить можно что угодно:
	 * кнопка остаётся кнопкой, клик и семантика не меняются.
	 */
	it('в default можно положить целую таблицу', () => {
		const wrapper = mount(Button, {
			props: { text: 'ignored' },
			slots: {
				default: '<table><tbody><tr><td>ячейка</td></tr></tbody></table>',
			},
		})

		expect(wrapper.find('.s-button__text table td').text()).toBe('ячейка')
		// Компонент не перестал быть кнопкой
		expect(wrapper.element.tagName.toLowerCase()).toBe('button')
	})

	it('scope доступен и при произвольной разметке', () => {
		const wrapper = mount(Button, {
			props: { text: 'Заголовок' },
			slots: {
				default: '<template #default="{ text }"><ul><li>{{ text }}</li></ul></template>',
			},
		})

		expect(wrapper.find('.s-button__text li').text()).toBe('Заголовок')
	})

	it('в leading и trailing тоже произвольная разметка', () => {
		const wrapper = mount(Button, {
			props: { text: 'Mid' },
			slots: { leading: '<svg><circle /></svg>', trailing: '<div><p>блок</p></div>' },
		})

		expect(wrapper.find('svg circle').exists()).toBe(true)
		expect(wrapper.find('p').text()).toBe('блок')
	})
})
