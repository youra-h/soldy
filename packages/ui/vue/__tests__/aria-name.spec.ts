/**
 * Доступное имя доходит до разметки через плагин.
 *
 * Проверка не формальная: `aria_label` — первый проп плагина, который пишется
 * снаружи, а не только читается. Все остальные плагинные пропсы `protected`,
 * то есть вычисляются внутри и наружу лишь отдаются. Поэтому путь
 * «атрибут в шаблоне → сеттер плагина → набор → DOM» стоит проверить целиком.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Button, Icon, Spinner } from '@soldy/ui-vue'

describe('Button', () => {
	it('иконочная кнопка получает имя', () => {
		// Без него у кнопки без текста нет доступного имени вообще
		const wrapper = mount(Button, { props: { aria_label: 'Закрыть' } })

		expect(wrapper.attributes('aria-label')).toBe('Закрыть')
	})

	it('без имени атрибута нет — имя вычислится из текста', () => {
		expect(mount(Button, { props: { text: 'Сохранить' } }).attributes('aria-label')).toBeUndefined()
	})

	it('labelledBy и describedBy доходят до разметки', () => {
		const wrapper = mount(Button, {
			props: { aria_labelledBy: 'title', aria_describedBy: 'hint' },
		})

		expect(wrapper.attributes('aria-labelledby')).toBe('title')
		expect(wrapper.attributes('aria-describedby')).toBe('hint')
	})

	it('имя следует за пропом', async () => {
		const wrapper = mount(Button, { props: { aria_label: 'Открыть' } })

		await wrapper.setProps({ aria_label: 'Закрыть' })
		await nextTick()

		expect(wrapper.attributes('aria-label')).toBe('Закрыть')
	})
})

describe('Icon', () => {
	it('без имени скрыта от скринридера', () => {
		// Иконка почти всегда дублирует соседний текст
		expect(mount(Icon).attributes('aria-hidden')).toBe('true')
	})

	it('с именем становится картинкой и перестаёт быть скрытой', () => {
		const wrapper = mount(Icon, { props: { aria_label: 'Ошибка' } })

		// Скрытый элемент не участвует в вычислении имени: плагин обязан снять
		// aria-hidden, поставленный ядром, а не просто добавить имя
		expect(wrapper.attributes('aria-hidden')).toBeUndefined()
		expect(wrapper.attributes('role')).toBe('img')
		expect(wrapper.attributes('aria-label')).toBe('Ошибка')
	})
})

describe('Spinner', () => {
	it('объявлен как живая область', () => {
		expect(mount(Spinner).attributes('role')).toBe('status')
	})

	it('имени по умолчанию нет: язык интерфейса библиотеке неизвестен', () => {
		expect(mount(Spinner).attributes('aria-label')).toBeUndefined()
	})

	it('имя задаётся потребителем', () => {
		expect(mount(Spinner, { props: { aria_label: 'Загрузка' } }).attributes('aria-label')).toBe(
			'Загрузка',
		)
	})
})
