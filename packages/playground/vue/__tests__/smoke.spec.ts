/**
 * Стенд обязан открываться на каждом компоненте.
 *
 * Смысл проверки шире, чем «страница не упала». Страница строится из
 * дескриптора и рисует компонент **всеми** его пропами разом, в двух режимах —
 * пропом и через экземпляр ядра. Если компонент падает на каком-то сочетании,
 * ломается здесь, а не глазами через месяц. Прежнее демо такой проверки не
 * имело и потому годами показывало не то.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'
import { COMPONENTS } from '@soldy/playground-shared'
import { AVAILABLE, SHOWCASE } from '../src/catalog'
import { PREVIEW_COMPONENTS } from '../src/previews'
import { router } from '../src/router'
import OverviewPage from '../src/views/OverviewPage.vue'
import ComponentPage from '../src/views/ComponentPage.vue'

beforeAll(async () => {
	setIcons(material as never)
	// Компоненты пишут в консоль события — в отчёте это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})
	router.push('/')
	await router.isReady()
})

const mountOptions = { global: { plugins: [router] }, attachTo: document.body }

describe('каталог адаптера', () => {
	/**
	 * Ключи карты превью — те же идентификаторы, что в общем реестре. Опечатка
	 * (`list_box` вместо `list-box`) не сломает ничего заметного: компонент
	 * просто молча исчезнет из меню, потому что каталог строится пересечением.
	 */
	it('каждое превью соответствует записи реестра', () => {
		const known = new Set(COMPONENTS.map((entry) => entry.id))
		const orphans = Object.keys(PREVIEW_COMPONENTS).filter((id) => !known.has(id))

		expect(orphans).toEqual([])
	})

	it('у каждой записи каталога есть превью', () => {
		expect(AVAILABLE.filter((entry) => !(entry.id in PREVIEW_COMPONENTS))).toEqual([])
	})
})

describe('витрина', () => {
	it('показывает все готовые компоненты', () => {
		const wrapper = mount(OverviewPage, mountOptions)

		expect(wrapper.findAll('.pg-cell')).toHaveLength(SHOWCASE.length)

		wrapper.unmount()
	})
})

describe('страница компонента', () => {
	it.each(AVAILABLE.map((entry) => [entry.id, entry] as const))(
		'%s открывается и рисует строку на каждый проп',
		(id, entry) => {
			const wrapper = mount(ComponentPage, { ...mountOptions, props: { id } })

			const editable = entry
				.descriptor()
				.props.filter((prop) => !prop.protected && prop.name.name !== 'ctrl')

			expect(wrapper.findAll('.pg-prop')).toHaveLength(editable.length)

			wrapper.unmount()
		},
	)

	it('на неизвестный идентификатор отвечает, а не падает', () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'нет-такого' } })

		expect(wrapper.find('.pg-empty').exists()).toBe(true)

		wrapper.unmount()
	})
})
