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
import { TTags, createEngineTags } from '@soldy-ui/core'
import type { ITagsProps, TTagsCollection, TTagsOverflow } from '@soldy-ui/core'
import { Tags } from '@soldy-ui/vue'
import * as material from '@soldy-ui/icons-material'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const TEXTS = ['Москва', 'Тверь', 'Тула']

/** Набор тегов, собранный снаружи: замер потом подставляется в его коллекцию. */
const createTags = (overflow: TTagsOverflow, props: Partial<ITagsProps> = {}) => {
	const ctrl = new TTags({ overflow, closable: true, ...props })
	const engine = createEngineTags({
		owner: ctrl,
		items: TEXTS.map((text) => ({ value: text, text })),
	})

	return { ctrl, engine: engine as TTagsCollection }
}

const mountTags = async (overflow: TTagsOverflow, props: Partial<ITagsProps> = {}) => {
	const { ctrl, engine } = createTags(overflow, props)

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

	it('ленты в этих режимах нет вовсе', async () => {
		await mountTags('wrap')

		expect(document.querySelector('.s-scroller')).toBeNull()
	})
})

/**
 * Режим `arrows`: ряд заворачивается в ленту, и рядом становится её вьюпорт.
 *
 * Здесь важна проводка — куда уехали теги, роль и состояния. Раскладку и само
 * листание проверяет `playground/vue/browser/tags-overflow.spec.ts`: в jsdom у
 * вьюпорта нет ни ширины, ни прокрутки.
 */
describe('режим arrows', () => {
	const viewport = (): HTMLElement => {
		const element = document.querySelector('.s-scroller__viewport')

		if (!(element instanceof HTMLElement)) throw new Error('вьюпорта ленты нет')

		return element
	}

	it('теги лежат во вьюпорте ленты, а не прямыми детьми корня', async () => {
		await mountTags('arrows')

		expect(textsIn(viewport())).toEqual(TEXTS)
		expect(row().querySelectorAll(':scope > .s-tags-item')).toHaveLength(0)
		// Каждый тег отрисован ровно один раз: второй перетёр бы запись в реестре
		expect(textsIn(document.body)).toEqual(TEXTS)
	})

	it('делить нечего: ни панели, ни кнопки «…»', async () => {
		await mountTags('arrows')

		expect(more()).toBeNull()
		expect(panel()).toBeNull()
		expect(row().dataset.overflow).toBe('arrows')
	})

	it('роль ряда стоит на вьюпорте, а корень её не несёт', async () => {
		const { engine } = await mountTags('arrows')

		expect(viewport().getAttribute('role')).toBe('list')
		expect(row().hasAttribute('role')).toBe(false)

		engine.extensions.selection.mode = 'multiple'
		await nextTick()

		expect(viewport().getAttribute('role')).toBe('listbox')
		expect(viewport().getAttribute('aria-orientation')).toBe('horizontal')
		expect(viewport().getAttribute('aria-multiselectable')).toBe('true')
		expect(row().hasAttribute('role')).toBe(false)
	})

	it('кнопки листания в разметке, и выключенность набора до них доезжает', async () => {
		const { ctrl } = await mountTags('arrows')

		const buttons = ['.s-scroller__prev', '.s-scroller__next'].map((selector) =>
			document.querySelector(selector),
		)

		expect(buttons.every((button) => button !== null)).toBe(true)

		ctrl.disabled = true
		await nextTick()

		expect(buttons.map((button) => button?.hasAttribute('disabled'))).toEqual([true, true])
	})

	/**
	 * Кнопки принадлежат ленте, и английские умолчания держит она: своих строк
	 * у Tags нет, а незаданный проп доезжает `undefined` и её дефолт не
	 * перетирает.
	 */
	it('имена кнопок не заданы — остаются умолчания ленты', async () => {
		await mountTags('arrows')

		expect(document.querySelector('.s-scroller__prev')?.getAttribute('aria-label')).toBe(
			'Scroll back',
		)
		expect(document.querySelector('.s-scroller__next')?.getAttribute('aria-label')).toBe(
			'Scroll forward',
		)
	})

	it('заданные Tags имена доезжают до кнопок и обновляются', async () => {
		const { ctrl } = await mountTags('arrows', { prevLabel: 'Назад', nextLabel: 'Вперёд' })

		expect(document.querySelector('.s-scroller__prev')?.getAttribute('aria-label')).toBe(
			'Назад',
		)
		expect(document.querySelector('.s-scroller__next')?.getAttribute('aria-label')).toBe(
			'Вперёд',
		)

		ctrl.prevLabel = 'К началу'
		await nextTick()

		expect(document.querySelector('.s-scroller__prev')?.getAttribute('aria-label')).toBe(
			'К началу',
		)
	})

	it('смена режима возвращает ряд на корень', async () => {
		const { ctrl, engine } = await mountTags('arrows')

		engine.extensions.selection.mode = 'multiple'
		ctrl.overflow = 'wrap'
		await nextTick()

		expect(document.querySelector('.s-scroller')).toBeNull()
		expect(row().getAttribute('role')).toBe('listbox')
		expect(textsIn(row())).toEqual(TEXTS)
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

	/**
	 * Ряд — флексбокс, и тег несёт свой номер в коллекции стилем (`order`):
	 * перестановка не переписывает разметку. Кнопка элементом коллекции не
	 * является, и без такого же номера она встала бы нулевой — то есть сразу
	 * за первым тегом, а не в конец ряда. Раскладку сторожит браузерный
	 * `playground/vue/browser/tags-overflow.spec.ts`, здесь — сам номер.
	 */
	it('кнопка «…» встаёт на место первого не поместившегося тега', async () => {
		const { engine } = await mountTags('popover')

		engine.extensions.overflow.notifyFit(2)
		await nextTick()

		const wrapper = document.querySelector('.s-tags__overflow')

		expect(wrapper?.getAttribute('style')).toContain('order: 2')

		engine.extensions.overflow.notifyFit(1)
		await nextTick()

		expect(document.querySelector('.s-tags__overflow')?.getAttribute('style')).toContain(
			'order: 1',
		)
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

describe('значок кнопки «…»', () => {
	it('иконка роли moreHoriz из пакета, а не символ многоточия текстом', async () => {
		const { engine } = await mountTags('popover')

		engine.extensions.overflow.notifyFit(1)
		await nextTick()

		const icon = more()?.querySelector('svg.s-icon')

		// Путь сверяется с пакетом: jsdom дописывает закрывающий тег, поэтому
		// строки `body` целиком сравнивать нечем
		const path = /d="([^"]+)"/.exec(material.moreHoriz.body)?.[1]

		expect(icon?.getAttribute('viewBox')).toBe(material.moreHoriz.viewBox)
		expect(icon?.querySelector('path')?.getAttribute('d')).toBe(path)
		// Текста у кнопки нет вовсе: имя ей даёт `aria-label`
		expect(more()?.textContent?.trim()).toBe('')
	})

	it('слот more-icon подменяет значок, панель и деление остаются', async () => {
		const { ctrl, engine } = createTags('popover')

		wrapper = mount(Tags, {
			props: { ctrl, engine },
			slots: { 'more-icon': '<i class="own-icon" />' },
			attachTo: document.body,
		})

		await nextTick()

		engine.extensions.overflow.notifyFit(1)
		await nextTick()

		expect(more()?.querySelector('.own-icon')).not.toBeNull()
		expect(more()?.querySelector('svg.s-icon')).toBeNull()
		expect(textsIn(row())).toEqual(['Москва'])
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
