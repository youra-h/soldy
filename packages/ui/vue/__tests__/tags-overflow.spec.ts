/**
 * Разметка переполнения: ряд рисует `fitted`, панель — `overflowed`.
 *
 * Каждый тег отрисован ровно один раз: вторая отрисовка того же элемента
 * перетёрла бы его запись в реестре bundles (ключ там `uid`), и плагины
 * пошли бы работать с чужим узлом. Поэтому здесь проверяется не только то,
 * что тег есть, но и то, что он один.
 *
 * Замер здесь подставляется руками (`notifyFit`) — в jsdom раскладки нет, и
 * плагин, который меряет ряд по-настоящему, проверяется в браузерном
 * `playground/vue/browser/tags-overflow.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TTags, createEngineTags } from '@soldy/core'
import type { TTagsCollection, TTagsOverflow } from '@soldy/core'
import { Tags } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const TEXTS = ['Москва', 'Тверь', 'Тула']

/** Набор тегов, собранный снаружи: замер потом подставляется в его коллекцию. */
const createTags = (overflow: TTagsOverflow) => {
	const ctrl = new TTags({ overflow, closable: true })
	const engine = createEngineTags({
		owner: ctrl,
		items: TEXTS.map((text) => ({ value: text, text })),
	})

	return { ctrl, engine: engine as TTagsCollection }
}

const mountTags = async (overflow: TTagsOverflow) => {
	const { ctrl, engine } = createTags(overflow)

	wrapper = mount(Tags, { props: { ctrl, engine }, attachTo: document.body })

	await nextTick()

	return { ctrl, engine }
}

/** Строки тегов внутри узла — носители текста. */
const textsIn = (scope: ParentNode) =>
	[...scope.querySelectorAll('.s-tags-item')].map((item) => item.textContent?.trim())

const row = (): HTMLElement => {
	const element = document.querySelector('.s-tags:not(.s-tags__panel)')

	if (!(element instanceof HTMLElement)) throw new Error('ряда тегов нет')

	return element
}

const panel = (): HTMLElement | null => document.querySelector('.s-tags__panel')

const more = (): HTMLElement | null => document.querySelector('.s-tags__more')

describe('режим wrap и scroll: панели нет', () => {
	it.each(['wrap', 'scroll'] as const)(
		'%s: все теги в ряду, кнопки «…» нет',
		async (overflow) => {
			await mountTags(overflow)

			expect(textsIn(row())).toEqual(TEXTS)
			expect(more()).toBeNull()
			expect(panel()).toBeNull()
		},
	)

	it('режим уезжает в тему через data-overflow', async () => {
		await mountTags('scroll')

		expect(row().dataset.overflow).toBe('scroll')
	})
})

describe('режим popover', () => {
	it('до замера теги в ряду, и кнопки «…» нет: хвоста нет — нет и её', async () => {
		await mountTags('popover')

		expect(textsIn(row())).toEqual(TEXTS)
		expect(more()).toBeNull()
	})

	it('после замера хвост уезжает в панель, и каждый тег отрисован один раз', async () => {
		const { engine } = await mountTags('popover')

		engine.extensions.overflow.notifyFit(1)
		await nextTick()

		expect(textsIn(row())).toEqual(['Москва'])
		expect(textsIn(document.body)).toEqual(TEXTS)

		const opened = panel()

		expect(opened).not.toBeNull()
		expect(textsIn(opened ?? document.createElement('div'))).toEqual(['Тверь', 'Тула'])
	})

	it('кнопка «…» несёт связку с панелью и своё имя', async () => {
		const { ctrl, engine } = await mountTags('popover')

		engine.extensions.overflow.notifyFit(1)
		ctrl.moreLabel = 'Ещё'
		await nextTick()

		const button = more()

		expect(button?.getAttribute('aria-label')).toBe('Ещё')
		expect(button?.getAttribute('aria-haspopup')).toBe('dialog')
		expect(button?.getAttribute('aria-expanded')).toBe('false')
		expect(button?.getAttribute('aria-controls')).toBeTruthy()
	})

	it('панель несёт классы ряда и его роль — селекторы вида до неё не достают', async () => {
		const { engine } = await mountTags('popover')

		engine.extensions.overflow.notifyFit(1)
		await nextTick()

		expect(panel()?.classList.contains('s-tags')).toBe(true)
		expect(panel()?.getAttribute('role')).toBe('list')
	})
})

describe('состав ряда принадлежит потребителю, когда он его объявил', () => {
	it('своё содержимое слота отменяет и деление, и панель', async () => {
		const { ctrl, engine } = createTags('popover')

		wrapper = mount(Tags, {
			props: { ctrl, engine },
			slots: { default: '<span class="own">свои теги</span>' },
			attachTo: document.body,
		})

		await nextTick()

		engine.extensions.overflow.notifyFit(0)
		await nextTick()

		expect(document.querySelectorAll('.own')).toHaveLength(1)
		expect(more()).toBeNull()
		expect(panel()).toBeNull()
	})
})
