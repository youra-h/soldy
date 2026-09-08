/**
 * Меню обязано открывать страницу.
 *
 * Дымовой тест монтировал страницы напрямую, минуя меню, и потому пропустил
 * ровно то, что видно с первого клика: `ListBox` был привязан через `value` и
 * `@update:value` — пропа и события, которых у него нет. Он коллекция, а не
 * контрол значения: выбор живёт в `selected` элементов.
 *
 * Проверка идёт через настоящее нажатие, а не через вызов обработчика: беда
 * была именно в проводке, а не в логике перехода.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'
import { SHOWCASE, LAYERS } from '../src/catalog'
import { router } from '../src/router'
import AppSidebar from '../src/components/AppSidebar.vue'

setIcons(material as never)
vi.spyOn(console, 'log').mockImplementation(() => {})

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

beforeEach(async () => {
	router.push('/')
	await router.isReady()
})

async function clickItem(index: number) {
	const wrapper = mount(AppSidebar, {
		global: { plugins: [router] },
		attachTo: document.body,
	})

	await nextTick()
	await nextFrame()

	// Кликается кнопка внутри строки, а не обёртка: обработчик выбора висит на
	// ней (`@click="context.adapters.selection.toggle()"` в ListBoxItem.vue).
	// Визуально кнопка занимает строку целиком, поэтому для пользователя это
	// одно и то же место.
	const items = wrapper.findAll('.s-list-box-item .s-button')

	await items[index].trigger('click')
	// router.push резолвится не в этом тике — без ожидания проверка успевала
	// увидеть прежний маршрут, а переход прилетал уже в следующий тест
	await flushPromises()

	return wrapper
}

describe('меню', () => {
	it('показывает все доступные адаптеру компоненты и слои', async () => {
		const wrapper = mount(AppSidebar, {
			global: { plugins: [router] },
			attachTo: document.body,
		})

		await nextTick()

		expect(wrapper.findAll('.s-list-box-item')).toHaveLength(SHOWCASE.length + LAYERS.length)

		wrapper.unmount()
	})

	it('нажатие на пункт открывает страницу компонента', async () => {
		const wrapper = await clickItem(0)

		expect(router.currentRoute.value.path).toBe(`/component/${SHOWCASE[0].id}`)

		wrapper.unmount()
	})

	it('нажатие на второй пункт уводит на него, а не остаётся на первом', async () => {
		const first = await clickItem(0)

		first.unmount()

		const second = await clickItem(1)

		expect(router.currentRoute.value.path).toBe(`/component/${SHOWCASE[1].id}`)

		second.unmount()
	})

	/** Подсветка — производная маршрута: прямая ссылка обязана её восстановить. */
	it('отмечает пункт, соответствующий адресу', async () => {
		router.push(`/component/${SHOWCASE[2].id}`)
		await router.isReady()
		await nextTick()

		const wrapper = mount(AppSidebar, {
			global: { plugins: [router] },
			attachTo: document.body,
		})

		await nextTick()
		await nextFrame()

		const selected = wrapper.findAll('[data-selected="true"]')

		expect(selected.length).toBeGreaterThan(0)

		wrapper.unmount()
	})
})
