/**
 * Адреса стенда и меню.
 *
 * Первый сегмент адреса — фреймворк превью: `/react/button`. Переключатель в
 * шапке меняет его и только его, неизвестный фреймворк ведёт на стенд по
 * умолчанию, а хост фреймворка грузит роутер до входа на страницу.
 *
 * Меню обязано открывать страницу. Дымовой тест монтировал страницы напрямую,
 * минуя меню, и потому пропустил ровно то, что видно с первого клика:
 * `ListBox` был привязан через `value` и `@update:value` — пропа и события,
 * которых у него нет. Он коллекция, а не контрол значения: выбор живёт в
 * `selected` элементов. Проверка идёт через настоящее нажатие, а не через
 * вызов обработчика: беда была именно в проводке, а не в логике перехода.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { layersOf, showcaseOf } from '../src/catalog'
import { DEFAULT_FRAMEWORK, FRAMEWORKS, hostOf, loadHost } from '../src/hosts'
import { router } from '../src/router'
import AppSidebar from '../src/components/AppSidebar.vue'
import AppHeader from '../src/components/AppHeader.vue'

setIcons(material)
vi.spyOn(console, 'log').mockImplementation(() => {})

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const mountOptions = { global: { plugins: [router] }, attachTo: document.body }

beforeEach(async () => {
	router.push('/')
	await router.isReady()
})

describe('хосты фреймворков', () => {
	/**
	 * Хост — папка `src/hosts/<id>/`, фреймворк — строка в списке загрузчика.
	 * Папка без строки недостижима из шапки, строка без папки роняет переход.
	 * Glob здесь только перечисляет папки и ничего не импортирует.
	 */
	it('у каждой строки списка — папка хоста, у каждой папки — строка', async () => {
		const folders = Object.keys(import.meta.glob('../src/hosts/*/index.ts')).map(
			(path) => path.split('/').at(-2) ?? '',
		)

		expect([...folders].sort()).toEqual(FRAMEWORKS.map(({ id }) => id).sort())

		for (const { id } of FRAMEWORKS) {
			const host = await loadHost(id)

			// Загружается однажды: второй вызов и страницы получают тот же хост
			expect(await loadHost(id)).toBe(host)
			expect(hostOf(id)).toBe(host)
		}
	})

	it('хоста, которого нет в списке, загрузчик не отдаёт', async () => {
		await expect(loadHost('нет-такого')).rejects.toThrow('нет хоста')
	})
})

describe('адреса', () => {
	it('корень ведёт на витрину фреймворка по умолчанию', () => {
		expect(router.currentRoute.value.path).toBe(`/${DEFAULT_FRAMEWORK}`)
		expect(DEFAULT_FRAMEWORK).toBe('vue')
	})

	it.each([
		'/angularx',
		'/angularx/button',
		'/angularx/tests/events/button',
		'/component/button',
	])('неизвестный фреймворк (%s) — на стенд по умолчанию', async (path) => {
		await router.push(path)

		expect(router.currentRoute.value.path).toBe('/vue')
	})

	it.each(FRAMEWORKS.map(({ id }) => id))(
		'%s: страница фреймворка открывается с загруженным хостом',
		async (framework) => {
			await router.push(`/${framework}/button`)

			expect(router.currentRoute.value.name).toBe('component')
			expect(router.currentRoute.value.params).toEqual({ framework, id: 'button' })
			expect(() => hostOf(framework)).not.toThrow()
		},
	)
})

/** Выбрать фреймворк, как человек: открыть «Фреймворк» в шапке и нажать пункт. */
async function chooseFramework(wrapper: VueWrapper, label: string): Promise<void> {
	const control = wrapper
		.findAll('.pg__control')
		.find((node) => node.get('.pg__control-label').text() === 'Фреймворк')

	if (!control) throw new Error('в шапке нет выбора «Фреймворк»')

	const field = control.get('input')

	await field.trigger('click')

	// Панель телепортирована — пункты ищутся по связке поля со списком
	const list = document.getElementById(field.attributes('aria-controls') ?? '')
	const option = [...(list?.querySelectorAll('[role="option"]') ?? [])].find(
		(node) => node.textContent?.trim() === label,
	)

	if (!(option instanceof HTMLElement)) throw new Error(`в списке фреймворков нет «${label}»`)

	option.click()
	await flushPromises()
}

describe('переключатель «Фреймворк» в шапке', () => {
	it.each([
		['/vue/button', '/react/button'],
		['/vue', '/react'],
		['/vue/tests/events/button', '/react/tests/events/button'],
	])('%s → %s: меняется только первый сегмент адреса', async (from, to) => {
		await router.push(from)

		const wrapper = mount(AppHeader, mountOptions)

		await nextTick()
		await nextFrame()

		await chooseFramework(wrapper, 'React')

		expect(router.currentRoute.value.path).toBe(to)

		wrapper.unmount()
	})
})

describe('меню', () => {
	async function mountSidebar(): Promise<VueWrapper> {
		const wrapper = mount(AppSidebar, mountOptions)

		await nextTick()
		await nextFrame()

		return wrapper
	}

	async function clickItem(index: number): Promise<VueWrapper> {
		const wrapper = await mountSidebar()

		// Кликается кнопка внутри строки, а не обёртка: обработчик выбора висит на
		// ней (`@click="context?.adapters.list.choose()"` в ListBoxItem.vue).
		// Визуально кнопка занимает строку целиком, поэтому для пользователя это
		// одно и то же место.
		const items = wrapper.findAll('.s-list-box-item .s-button')

		await items[index].trigger('click')
		// router.push резолвится не в этом тике — без ожидания проверка успевала
		// увидеть прежний маршрут, а переход прилетал уже в следующий тест
		await flushPromises()

		return wrapper
	}

	it.each(FRAMEWORKS.map(({ id }) => id))(
		'%s: показывает все компоненты и слои, которые умеет хост',
		async (framework) => {
			await router.push(`/${framework}`)

			const wrapper = await mountSidebar()
			const host = hostOf(framework)

			expect(wrapper.findAll('.s-list-box-item')).toHaveLength(
				showcaseOf(host).length + layersOf(host).length,
			)

			wrapper.unmount()
		},
	)

	it('нажатие на пункт открывает страницу компонента того же фреймворка', async () => {
		await router.push('/react')

		const wrapper = await clickItem(0)

		expect(router.currentRoute.value.path).toBe(`/react/${showcaseOf(hostOf('react'))[0].id}`)

		wrapper.unmount()
	})

	it('нажатие на второй пункт уводит на него, а не остаётся на первом', async () => {
		const showcase = showcaseOf(hostOf('vue'))
		const first = await clickItem(0)

		first.unmount()

		const second = await clickItem(1)

		expect(router.currentRoute.value.path).toBe(`/vue/${showcase[1].id}`)

		second.unmount()
	})

	/** Подсветка — производная маршрута: прямая ссылка обязана её восстановить. */
	it('отмечает пункт, соответствующий адресу', async () => {
		await router.push(`/vue/${showcaseOf(hostOf('vue'))[2].id}`)

		const wrapper = await mountSidebar()
		const selected = wrapper.findAll('[data-selected="true"]')

		expect(selected.length).toBeGreaterThan(0)

		wrapper.unmount()
	})
})
