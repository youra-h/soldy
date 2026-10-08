/**
 * Язык библиотеки в шапке стенда.
 *
 * Своего языка у компонента нет — это локаль провайдера вокруг стенда
 * (`LocaleProvider` в `App.vue`), а на стенде её выбирает «Язык» в шапке
 * (`useLanguage`). Проверяется проводка через настоящее нажатие: выбор доходит
 * до компонентов на странице без перемонтирования — и подписи дат, и строки
 * библиотеки — и переживает перезагрузку стенда.
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { Calendar, LocaleProvider } from '@soldy-ui/vue'
import { LOCALES } from '@soldy-ui/playground-shared'
import { router } from '../src/router'
import AppHeader from '../src/components/AppHeader.vue'
import { useLanguage } from '../src/composables/useLanguage'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Шапка и календарь под провайдером языка стенда — как превью в `App.vue`. */
const Page = defineComponent({
	setup() {
		const { locale } = useLanguage()

		return () =>
			h(LocaleProvider, { locale: locale.value }, () =>
				h('div', [h(AppHeader), h(Calendar, { months: ['2026-09-01'] })]),
			)
	},
})

/** Подпись языка в списке шапки. */
function labelOf(tag: string): string {
	const entry = LOCALES[tag]

	if (!entry) throw new Error(`языка ${tag} нет в списке стенда`)

	return entry.label
}

/** Смонтированная страница теста — `afterEach` возвращает через неё язык. */
let page: VueWrapper | undefined

async function mountPage(): Promise<VueWrapper> {
	page = mount(Page, { global: { plugins: [router] }, attachTo: document.body })

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
}

/** Подписи колонок календаря по порядку. */
const weekdays = () =>
	[...document.querySelectorAll('.s-calendar__weekday')].map((cell) => cell.textContent?.trim())

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
	it('доходит до календаря на странице без перемонтирования', async () => {
		const wrapper = await mountPage()
		const grid = document.querySelector('.s-calendar__grid')
		const prev = document.querySelector('.s-calendar__prev')

		expect(weekdays()).toEqual(week('en-US', 0))
		expect(prev?.getAttribute('aria-label')).toBe('Previous month')

		await choose(wrapper, labelOf('ru-RU'))

		expect(document.querySelector('.s-calendar__grid')).toBe(grid)
		expect(weekdays()).toEqual(week('ru-RU', 1))
		expect(prev?.getAttribute('aria-label')).toBe('Предыдущий месяц')
	})

	it('переживает перезагрузку стенда', async () => {
		await choose(await mountPage(), labelOf('ru-RU'))

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
