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
 * которых у него тогда не было. Проверка идёт через настоящее нажатие, а не
 * через вызов обработчика: беда была именно в проводке, а не в логике
 * перехода.
 *
 * Меню — один список с группами реестра (`COMPONENT_GROUPS`): пункты на экране
 * идут порядком `menuOf`, у каждой группы — подпись, «Слои» — последними.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { COMPONENT_GROUPS } from '@soldy-ui/playground-shared'
import { menuOf, showcaseOf } from '../src/catalog'
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
		.find((node) => node.get('.pg__control > .so-field__label').text() === 'Фреймворк')

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

/**
 * Контрол шапки — поле формы `Field`: подпись называет `<input>` контрола
 * сама, своим `for`, и становится его именем. Своей разметки подписи рядом с
 * контролом у оболочки нет. Сверяются все шесть контролов, в порядке
 * разметки.
 */
describe('контролы шапки', () => {
	const SETTINGS = ['Фреймворк', 'Анимация движения', 'Язык', 'Тема', 'Иконки', 'Тёмная']

	it('подпись каждого контрола ведёт на его поле', async () => {
		const wrapper = mount(AppHeader, mountOptions)

		await nextTick()
		await nextFrame()

		const links = wrapper.findAll('.pg__control').map((control) => {
			const label = control.get('.pg__control > .so-field__label')
			const input = control.get('.pg__control > .so-field__control input').element

			return [label.text(), input.id !== '' && label.attributes('for') === input.id]
		})

		wrapper.unmount()

		expect(links).toEqual(SETTINGS.map((label) => [label, true]))
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
		const items = wrapper.findAll('.so-list-box-item .so-button')

		await items[index].trigger('click')
		// router.push резолвится не в этом тике — без ожидания проверка успевала
		// увидеть прежний маршрут, а переход прилетал уже в следующий тест
		await flushPromises()

		return wrapper
	}

	/** Группы списка по порядку: подпись и тексты её пунктов. */
	function sectionsOf(wrapper: VueWrapper): [string, string[]][] {
		return wrapper
			.findAll('.so-list-box-group')
			.map((group) => [
				group.get('.so-list-box-group__label').text(),
				group.findAll('.so-list-box-item').map((item) => item.text()),
			])
	}

	/** Отмеченные пункты — текстами. */
	function selectedOf(wrapper: VueWrapper): string[] {
		return wrapper.findAll('[role="option"][aria-selected="true"]').map((item) => item.text())
	}

	it.each(FRAMEWORKS.map(({ id }) => id))(
		'%s: один список — все компоненты и слои хоста, группами реестра',
		async (framework) => {
			await router.push(`/${framework}`)

			const wrapper = await mountSidebar()
			const menu = menuOf(hostOf(framework))

			// Список один, и имя у него своё: заголовков над ним больше нет
			expect(wrapper.findAll('[role="listbox"]')).toHaveLength(1)
			expect(wrapper.get('[role="listbox"]').attributes('aria-label')).toBe('Компоненты')

			// Пункты на экране — порядком данных меню
			expect(wrapper.findAll('.so-list-box-item').map((item) => item.text())).toEqual(
				menu.map((entry) => entry.label),
			)

			// Группы — непустые группы хоста порядком реестра, у каждой подпись и
			// все её пункты; пунктов без группы нет
			expect(sectionsOf(wrapper)).toEqual(
				Object.entries(COMPONENT_GROUPS)
					.map(([key, label]): [string, string[]] => [
						label,
						menu.filter((entry) => entry.group === key).map((entry) => entry.label),
					])
					.filter(([, labels]) => labels.length > 0),
			)

			// Внутри группы — по алфавиту
			for (const [, labels] of sectionsOf(wrapper)) {
				expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
			}

			wrapper.unmount()
		},
	)

	/** Слои наследования — не второй список, а последняя группа того же. */
	it('«Слои» — последняя группа, на витрину слои не попадают', async () => {
		await router.push('/vue')

		const wrapper = await mountSidebar()
		const host = hostOf('vue')
		const layers = menuOf(host).filter((entry) => entry.group === 'layers')

		expect(layers.length).toBeGreaterThan(0)
		expect(sectionsOf(wrapper).at(-1)).toEqual([
			COMPONENT_GROUPS.layers,
			layers.map((entry) => entry.label),
		])
		expect(showcaseOf(host).filter((entry) => layers.includes(entry))).toEqual([])
		expect(showcaseOf(host)).toHaveLength(menuOf(host).length - layers.length)

		wrapper.unmount()
	})

	it('нажатие на пункт открывает страницу компонента того же фреймворка', async () => {
		await router.push('/react')

		const wrapper = await clickItem(0)

		expect(router.currentRoute.value.path).toBe(`/react/${menuOf(hostOf('react'))[0].id}`)

		wrapper.unmount()
	})

	it('нажатие на второй пункт уводит на него, а не остаётся на первом', async () => {
		const menu = menuOf(hostOf('vue'))
		const first = await clickItem(0)

		first.unmount()

		const second = await clickItem(1)

		expect(router.currentRoute.value.path).toBe(`/vue/${menu[1].id}`)

		second.unmount()
	})

	/**
	 * Список один, поэтому и отметка одна: пункт из «Слоёв» снимает её с
	 * компонента, как соседний пункт той же группы.
	 */
	it('нажатие на слой открывает его страницу, и отмечен только он', async () => {
		const menu = menuOf(hostOf('vue'))
		const layer = menu.length - 1

		await router.push(`/vue/${menu[0].id}`)

		const wrapper = await clickItem(layer)

		expect(menu[layer].group).toBe('layers')
		expect(router.currentRoute.value.path).toBe(`/vue/${menu[layer].id}`)
		expect(selectedOf(wrapper)).toEqual([menu[layer].label])

		wrapper.unmount()
	})

	/** Подсветка — производная маршрута: прямая ссылка обязана её восстановить. */
	it('отмечает пункт, соответствующий адресу', async () => {
		const entry = menuOf(hostOf('vue'))[2]

		await router.push(`/vue/${entry.id}`)

		const wrapper = await mountSidebar()

		expect(selectedOf(wrapper)).toEqual([entry.label])

		wrapper.unmount()
	})
})
