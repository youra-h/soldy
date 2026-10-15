/**
 * Язык библиотеки в шапке стенда.
 *
 * Своего языка у компонента нет — это локаль провайдера, а на стенде её
 * выбирает «Язык» в шапке (`useLanguage`). Превью рисуют хосты фреймворков в
 * своих корнях, и контекст провайдера оболочки туда не проходит: язык каждому
 * корню отдаёт загрузчик хостов (`setLocale`), а у корня свой провайдер.
 * Проверяется проводка через настоящее нажатие на настоящей странице: выбор
 * доходит до превью без перемонтирования — и подписи дат, и строки библиотеки
 * — у каждого фреймворка, и переживает перезагрузку стенда.
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TButton } from '@soldy-ui/core'
import { TPluginBundle } from '@soldy-ui/plugins'
import { LOCALES } from '@soldy-ui/playground-shared'
import { TLocaleProviderElement } from '@soldy-ui/webc'
import { loadHost } from '../src/hosts'
import { router } from '../src/router'
import App from '../src/App.vue'
import PropControl from '../src/components/PropControl.vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Подпись языка в списке шапки. */
function labelOf(tag: string): string {
	const entry = LOCALES[tag]

	if (!entry) throw new Error(`языка ${tag} нет в списке стенда`)

	return entry.label
}

/** Смонтированный стенд теста — `afterEach` возвращает через него язык. */
let page: VueWrapper | undefined

/** Стенд целиком — шапка и страница по адресу, как его открывает человек. */
async function open(path: string): Promise<VueWrapper> {
	await router.push(path)

	page = mount(App, { global: { plugins: [router] }, attachTo: document.body })

	await nextTick()
	await nextFrame()

	return page
}

/** Выбрать язык, как человек: открыть «Язык» в шапке и нажать пункт. */
async function choose(wrapper: VueWrapper, label: string): Promise<void> {
	const control = wrapper
		.findAll('.pg__control')
		.find((node) => node.get('.pg__control-label').text() === 'Язык')

	if (!control) throw new Error('в шапке нет выбора «Язык»')

	const field = control.get('input')

	await field.trigger('click')

	// Панель телепортирована — пункты ищутся по связке поля со списком
	const list = document.getElementById(field.attributes('aria-controls') ?? '')
	const option = [...(list?.querySelectorAll('[role="option"]') ?? [])].find(
		(node) => node.textContent?.trim() === label,
	)

	if (!(option instanceof HTMLElement)) throw new Error(`в списке языков нет «${label}»`)

	option.click()
	await nextTick()
	await nextFrame()
}

/** Строка страницы по имени пропа. */
function rowOf(wrapper: VueWrapper, name: string): DOMWrapper<Element> {
	const found = wrapper
		.findAll('.pg-prop')
		.find((row) => row.find('.pg-prop__name').text() === name)

	if (!found) throw new Error(`нет строки ${name}`)

	return found
}

/**
 * Короткие имена недели языка `locale`, с первого дня `first` (2026-09-20 —
 * воскресенье): у `en-US` и `ru-RU` подпись колонки — короткое имя.
 */
function week(locale: string, first: number): string[] {
	const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })

	return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
		short.format(Date.UTC(2026, 8, 20 + first + offset)),
	)
}

beforeAll(async () => {
	// Превью пишут события в консоль — в отчёте это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})
	router.push('/')
	await router.isReady()
})

afterEach(async () => {
	// Язык стенда общий и сохраняется — возвращается тем же путём, что ставится
	if (page) {
		await choose(page, labelOf('en-US'))
		page.unmount()
		page = undefined
	}

	document.body.innerHTML = ''
	localStorage.clear()
})

describe('выбор «Язык» в шапке', () => {
	it('доходит до календаря хоста Vue без перемонтирования', async () => {
		const wrapper = await open('/vue/calendar')
		const calendar = wrapper.get('.pg-col__stage .s-calendar')
		const grid = calendar.get('.s-calendar__grid').element
		const prev = calendar.get('.s-calendar__prev').element
		const weekdays = () =>
			calendar.findAll('.s-calendar__weekday').map((cell) => cell.text().trim())

		expect(weekdays()).toEqual(week('en-US', 0))
		expect(prev.getAttribute('aria-label')).toBe('Previous month')

		await choose(wrapper, labelOf('ru-RU'))

		expect(calendar.get('.s-calendar__grid').element).toBe(grid)
		expect(weekdays()).toEqual(week('ru-RU', 1))
		expect(prev.getAttribute('aria-label')).toBe('Предыдущий месяц')
	})

	/**
	 * У React, Svelte и Solid своя локаль корня: строка кнопки очистки поля —
	 * `field.clear` — переводится на лету, а кнопка остаётся тем же узлом. Обе
	 * колонки: вторую рисует тот же хост с экземпляром ядра.
	 */
	it.each([
		['React', 'react'],
		['Svelte', 'svelte'],
		['Solid', 'solid'],
	])('доходит до имени кнопки очистки Input хоста %s без перемонтирования', async (_name, id) => {
		const wrapper = await open(`/${id}/input`)
		const row = rowOf(wrapper, 'clearable')

		row.findComponent(PropControl).vm.$emit('update:modelValue', true)
		await nextTick()
		await nextFrame()

		const buttons = row
			.findAll('.pg-col__stage .s-input__clear')
			.map((button) => button.element)
		const names = () => buttons.map((button) => button.getAttribute('aria-label'))

		expect(buttons).toHaveLength(2)
		expect(names()).toEqual(['Clear', 'Clear'])

		await choose(wrapper, labelOf('ru-RU'))

		expect(
			row.findAll('.pg-col__stage .s-input__clear').map((button) => button.element),
		).toEqual(buttons)
		expect(names()).toEqual(['Очистить', 'Очистить'])
	})

	/**
	 * У Web Components корень хоста — `<so-locale-provider>`, и язык шапки хост
	 * пишет ему в источник. Компонентов со строками у адаптера ещё нет, поэтому
	 * видна сама локаль корня — у обеих колонок, — а кнопка остаётся тем же
	 * узлом: элемент не пересобран.
	 */
	it('доходит до корня хоста Web Components без перемонтирования', async () => {
		const wrapper = await open('/webc/button')
		const row = rowOf(wrapper, 'text')
		const roots = row.findAll('.pg-col__stage so-locale-provider').map((root) => root.element)
		const buttons = () =>
			row.findAll('.pg-col__stage .s-button').map((button) => button.element)
		const before = buttons()
		const tags = () =>
			roots.map((root) => (root instanceof TLocaleProviderElement ? root.locale.tag : null))

		expect(roots).toHaveLength(2)
		expect(before).toHaveLength(2)
		expect(tags()).toEqual(['en-US', 'en-US'])

		await choose(wrapper, labelOf('ru-RU'))

		expect(buttons()).toEqual(before)
		expect(tags()).toEqual(['ru-RU', 'ru-RU'])
	})

	/**
	 * У Angular корень хоста — свой компонент с `so-locale-provider`: язык шапки
	 * хост пишет в него, а провайдер — в свой источник. Компонентов со строками
	 * у адаптера ещё нет, и видна сама локаль корня — источник, с которым сборка
	 * компонента собрала набор плагинов (`bundle.locale`). Набор экземпляр ядра
	 * отдаёт событием сборки, поэтому его ловит обёртка над `mount` хоста:
	 * колонка экземпляра монтирует компонент с `ctrl`. Кнопки остаются теми же
	 * узлами: компоненты не пересобраны.
	 */
	it('доходит до корня хоста Angular без перемонтирования', async () => {
		const host = await loadHost('angular')
		const draw = host.mount
		const bundles: TPluginBundle[] = []
		const spy = vi.spyOn(host, 'mount').mockImplementation((node, options) => {
			const { ctrl } = options.props

			if (ctrl instanceof TButton) {
				ctrl.events.on('bundle:create', (bundle) => {
					if (bundle instanceof TPluginBundle) bundles.push(bundle)
				})
			}

			return draw.call(host, node, options)
		})

		try {
			const wrapper = await open('/angular/button')
			const row = rowOf(wrapper, 'text')
			const buttons = () =>
				row.findAll('.pg-col__stage .s-button').map((button) => button.element)
			const before = buttons()
			const tags = () => new Set(bundles.map((bundle) => bundle.locale.locale.tag))

			expect(before).toHaveLength(2)
			expect(bundles.length).toBeGreaterThan(0)
			expect(tags()).toEqual(new Set(['en-US']))

			await choose(wrapper, labelOf('ru-RU'))

			expect(buttons()).toEqual(before)
			expect(tags()).toEqual(new Set(['ru-RU']))
		} finally {
			spy.mockRestore()
		}
	})

	it('переживает перезагрузку стенда', async () => {
		await choose(await open('/vue'), labelOf('ru-RU'))

		// Новая страница: модули стенда — заново, язык — из хранилища
		vi.resetModules()

		const { effectScope } = await import('vue')
		const { useLanguage } = await import('../src/composables/useLanguage')
		const scope = effectScope()
		const reloaded = scope.run(() => useLanguage())

		expect(reloaded?.language.value).toBe('ru-RU')

		scope.stop()
	})
})
