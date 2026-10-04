/**
 * Режим движения в шапке стенда: переключатель и плашка «движение выключено».
 *
 * Режим стенд держит сам и отдаёт библиотеке (`useMotion`), а выключено ли
 * движение, считает тоже сам — по своему режиму и ответу системы
 * (`useMotionMode`). Проверяется проводка, через настоящее нажатие: выбор в
 * шапке доходит до атрибута корня и переживает перезагрузку, а плашка идёт за
 * режимом и за сменой ответа системы.
 *
 * Ответ системы — заглушка `matchMedia`: в jsdom медиазапросов нет вовсе.
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { MOTION_MODES } from '@soldy-ui/playground-shared'
import { router } from '../src/router'
import AppHeader from '../src/components/AppHeader.vue'

/** Атрибут режима на корне документа — контракт библиотеки с темой. */
const ATTRIBUTE = 'data-s-motion'

const SYSTEM_REDUCE = '(prefers-reduced-motion: reduce)'

const attribute = () => document.documentElement.getAttribute(ATTRIBUTE)

/**
 * Медиазапрос заглушки: ответ задаёт тест, смену ответа шлёт `answer` — как
 * браузер, событием `change` подписчикам. Подписчики на виду: по ним видно,
 * что шапка отписалась.
 */
class TFakeMediaQuery {
	readonly listeners = new Set<() => void>()

	constructor(
		readonly media: string,
		public matches: boolean,
	) {}

	addEventListener(type: string, listener: () => void): void {
		if (type === 'change') this.listeners.add(listener)
	}

	removeEventListener(type: string, listener: () => void): void {
		if (type === 'change') this.listeners.delete(listener)
	}

	/** Система сменила ответ. */
	answer(matches: boolean): void {
		this.matches = matches

		for (const listener of this.listeners) listener()
	}
}

/** Система просит меньше движения или нет; прочие медиазапросы не совпадают. */
function stubSystem(reduces: boolean): TFakeMediaQuery {
	const system = new TFakeMediaQuery(SYSTEM_REDUCE, reduces)

	vi.stubGlobal('matchMedia', (media: string) =>
		media === SYSTEM_REDUCE ? system : new TFakeMediaQuery(media, false),
	)

	return system
}

const mountOptions = { global: { plugins: [router] }, attachTo: document.body }

/** Смонтированная шапка теста — `afterEach` возвращает через неё режим. */
let header: VueWrapper | undefined

/**
 * Шапка на странице. Нажатия Select слушает с кадра после монтирования:
 * `TElementPlugin` отдаёт узел плагинам через requestAnimationFrame.
 */
async function mountHeader(): Promise<VueWrapper> {
	header = mount(AppHeader, mountOptions)

	await nextTick()
	await new Promise((resolve) => requestAnimationFrame(resolve))

	return header
}

/** Выбрать режим, как человек: открыть «Движение» в шапке и нажать пункт. */
async function choose(wrapper: VueWrapper, label: string): Promise<void> {
	const control = wrapper
		.findAll('.pg__control')
		.find((node) => node.get('.pg__control-label').text() === 'Движение')

	if (!control) throw new Error('в шапке нет переключателя «Движение»')

	const field = control.get('input')

	await field.trigger('click')

	// Панель телепортирована — пункты ищутся по связке поля со списком
	const list = document.getElementById(field.attributes('aria-controls') ?? '')
	const option = [...(list?.querySelectorAll('[role="option"]') ?? [])].find(
		(node) => node.textContent?.trim() === label,
	)

	if (!(option instanceof HTMLElement)) throw new Error(`в списке режимов нет «${label}»`)

	option.click()
	await nextTick()
}

const banner = (wrapper: VueWrapper) => wrapper.find('.pg__motion-off')

beforeAll(async () => {
	router.push('/')
	await router.isReady()
})

afterEach(async () => {
	// Режим стенда общий и сохраняется — возвращается тем же путём, что ставится
	if (header) {
		await choose(header, MOTION_MODES.system)
		header.unmount()
		header = undefined
	}

	localStorage.clear()
	vi.unstubAllGlobals()
})

describe('переключатель «Движение»', () => {
	it('выбор ставит режим на корень документа, «Система» его снимает', async () => {
		const wrapper = await mountHeader()

		await choose(wrapper, MOTION_MODES.reduce)
		expect(attribute()).toBe('reduce')

		await choose(wrapper, MOTION_MODES.full)
		expect(attribute()).toBe('full')

		await choose(wrapper, MOTION_MODES.system)
		expect(attribute()).toBeNull()
	})

	it('выбор переживает перезагрузку стенда', async () => {
		await choose(await mountHeader(), MOTION_MODES.reduce)

		// Новая страница: атрибута на корне ещё нет, модули стенда — заново
		document.documentElement.removeAttribute(ATTRIBUTE)
		vi.resetModules()

		const { effectScope } = await import('vue')
		const { useMotionMode } = await import('../src/composables/useMotionMode')
		const scope = effectScope()
		const reloaded = scope.run(() => useMotionMode())

		expect(reloaded?.mode.value).toBe('reduce')
		expect(attribute()).toBe('reduce')

		scope.stop()
	})
})

describe('плашка «движение выключено»', () => {
	it('при «Без движения» — режимом стенда, и «Всегда» вернёт его', async () => {
		stubSystem(false)

		const wrapper = await mountHeader()

		expect(banner(wrapper).exists()).toBe(false)

		await choose(wrapper, MOTION_MODES.reduce)

		expect(banner(wrapper).text()).toBe(
			'Движение выключено — режимом стенда. «Всегда» вернёт его',
		)
	})

	it('при «Система» — когда так просит система', async () => {
		stubSystem(true)

		const wrapper = await mountHeader()

		expect(banner(wrapper).text()).toBe(
			'Движение выключено — так просит система. «Всегда» вернёт его',
		)
	})

	it('при «Всегда» её нет, даже когда система просит меньше движения', async () => {
		stubSystem(true)

		const wrapper = await mountHeader()

		await choose(wrapper, MOTION_MODES.full)

		expect(banner(wrapper).exists()).toBe(false)
	})

	it('идёт за сменой ответа системы', async () => {
		const system = stubSystem(false)
		const wrapper = await mountHeader()

		system.answer(true)
		await nextTick()

		expect(banner(wrapper).exists()).toBe(true)

		system.answer(false)
		await nextTick()

		expect(banner(wrapper).exists()).toBe(false)
	})

	it('без matchMedia система о движении не просит', async () => {
		expect(banner(await mountHeader()).exists()).toBe(false)
	})

	it('размонтированная шапка систему больше не слушает', async () => {
		const system = stubSystem(false)
		const wrapper = mount(AppHeader, mountOptions)

		expect(system.listeners.size).toBe(1)

		wrapper.unmount()

		expect(system.listeners.size).toBe(0)
	})
})
