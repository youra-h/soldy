/**
 * Стенд обязан открываться на каждом компоненте.
 *
 * Смысл проверки шире, чем «страница не упала». Страница строится из
 * дескриптора и рисует компонент **всеми** его пропами разом, в двух режимах —
 * пропом и через экземпляр ядра. Если компонент падает на каком-то сочетании,
 * ломается здесь, а не глазами через месяц. Прежнее демо такой проверки не
 * имело и потому годами показывало не то.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'
import { COMPONENTS } from '@soldy/playground-shared'
import { AVAILABLE, SHOWCASE } from '../src/catalog'
import { PREVIEW_COMPONENTS } from '../src/previews'
import { router } from '../src/router'
import OverviewPage from '../src/views/OverviewPage.vue'
import ComponentPage from '../src/views/ComponentPage.vue'

/**
 * Предупреждения Vue.
 *
 * Стенд — единственное место, где компоненты рисуются всеми пропами разом, и
 * поэтому единственное, где такие предупреждения вообще всплывают. Первый же
 * запуск дал «emitted event "update:anchor_anchor" but it is neither declared
 * in the emits option»: `useEmits` перечислял только собственные пропы, а
 * `useSyncEvents` эмитил и плагинные.
 *
 * Ошибка тихая — в консоли, но не в тестах. Поэтому здесь она превращается в
 * падение: любое предупреждение Vue при отрисовке страницы означает, что
 * контракт компонента и его проводка разошлись.
 */
const warnings: string[] = []

beforeAll(async () => {
	setIcons(material as never)
	// Компоненты пишут в консоль события — в отчёте это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})
	vi.spyOn(console, 'warn').mockImplementation((...args) => {
		warnings.push(args.map(String).join(' '))
	})
	router.push('/')
	await router.isReady()
})

beforeEach(() => {
	warnings.length = 0
})

/** Первая строка предупреждения: дальше идёт дерево компонентов, оно шумит. */
function firstLines(): string[] {
	return warnings.map((text) => text.split('\n')[0])
}

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
		expect(firstLines()).toEqual([])

		wrapper.unmount()
	})
})

describe('страница компонента', () => {
	it.each(AVAILABLE.map((entry) => [entry.id, entry] as const))(
		'%s открывается и рисует строку на каждый проп',
		async (id, entry) => {
			const wrapper = mount(ComponentPage, { ...mountOptions, props: { id } })

			// Часть проводки включается кадром позже: `TElementPlugin` отдаёт узел
			// через requestAnimationFrame, и только тогда плагины вроде якоря Frame
			// получают элемент и эмитят свои `update:`. Без ожидания проверка
			// предупреждений ниже была бы вакуумной — до эмита тест не доживал.
			await nextTick()
			await nextFrame()

			const editable = entry
				.descriptor()
				.props.filter((prop) => !prop.protected && prop.name.name !== 'ctrl')

			expect(wrapper.findAll('.pg-prop')).toHaveLength(editable.length)
			expect(firstLines()).toEqual([])

			wrapper.unmount()
		},
	)

	it('на неизвестный идентификатор отвечает, а не падает', () => {
		const wrapper = mount(ComponentPage, { ...mountOptions, props: { id: 'нет-такого' } })

		expect(wrapper.find('.pg-empty').exists()).toBe(true)

		wrapper.unmount()
	})
})
