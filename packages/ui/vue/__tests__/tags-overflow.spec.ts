/**
 * Разметка переполнения ряда тегов и слоты своей раскладки.
 *
 * У набора два режима, `wrap` и `scroll`, и оба — раскладка темы: разметка
 * отдаёт режим через `data-overflow` и рисует все показанные теги. Ленту со
 * стрелками или хвост в панели собирают в своей разметке: слот `default`
 * отдаёт ей показанные теги (`shown`), а Select — слот `tags` со своим
 * инстансом тегов и его коллекцией.
 *
 * Раскладку проверяет браузерный `playground/vue/browser/tags-overflow.spec.ts`:
 * в jsdom у ряда нет ни ширины, ни прокрутки.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TTags, createEngineTags } from '@soldy-ui/core'
import type { ITags, ITagsItem, TTagsCollection, TTagsOverflow } from '@soldy-ui/core'
import { Select, SelectItem, Tags, TagsItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

const TEXTS = ['Москва', 'Тверь', 'Тула']

const mountTags = async (overflow: TTagsOverflow) => {
	const ctrl = new TTags({ overflow, closable: true })
	const engine = createEngineTags({
		owner: ctrl,
		items: TEXTS.map((text) => ({ value: text, text })),
	})

	wrapper = mount(Tags, {
		props: { ctrl, engine: engine as TTagsCollection },
		attachTo: document.body,
	})

	await nextTick()
}

/** Строки тегов внутри узла — носители текста. */
const textsIn = (scope: ParentNode) =>
	[...scope.querySelectorAll('.s-tags-item')].map((item) => item.textContent?.trim())

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: узла нет`)

	return element
}

/** Своя раскладка тегов: обёртка с классом и в ней по `TagsItem` на тег. */
const ownRow = (shown: ITagsItem[]) =>
	h(
		'div',
		{ class: 'own' },
		shown.map((item) => h(TagsItem, { key: item.uid, ctrl: item })),
	)

describe('режимы wrap и scroll', () => {
	it.each(['wrap', 'scroll'] as const)('%s: все теги в ряду', async (overflow) => {
		await mountTags(overflow)

		expect(textsIn(find('.s-tags'))).toEqual(TEXTS)
	})

	it('режим уезжает в тему через data-overflow', async () => {
		await mountTags('scroll')

		expect(find('.s-tags').dataset.overflow).toBe('scroll')
	})
})

/**
 * Слот `default` отдаёт показанные теги: так их раскладывают в ленту или
 * делят на ряд и панель, не трогая набор. Тег в своей разметке — тот же
 * элемент коллекции: закрывается и выбывает так же.
 */
describe('слот default: своя раскладка показанных тегов', () => {
	const mountOwn = async () => {
		wrapper = mount(Tags, {
			props: { closable: true, items: TEXTS.map((text) => ({ value: text, text })) },
			slots: { default: ({ shown }: { shown: ITagsItem[] }) => ownRow(shown) },
			attachTo: document.body,
		})

		await nextTick()
	}

	it('теги стоят в своей разметке, каждый — один раз', async () => {
		await mountOwn()

		expect(textsIn(find('.own'))).toEqual(TEXTS)
		expect(document.querySelectorAll('.s-tags-item')).toHaveLength(TEXTS.length)
	})

	it('закрытый тег выбывает и из своей разметки', async () => {
		await mountOwn()

		const close = find('.own .s-tags-item:nth-child(2) .s-tags-item__close')

		close.click()
		await nextTick()

		expect(textsIn(find('.own'))).toEqual(['Москва', 'Тула'])
	})
})

/**
 * Слот `tags` у Select отдаёт инстанс тегов и его коллекцию — то, что
 * встроенный `Tags` берёт `:ctrl` и `:engine`. Свой ряд получает связку
 * «опция ⇄ тег» готовой.
 */
describe('слот tags у Select', () => {
	type TTagsScope = { tags: ITags; engine: TTagsCollection }

	const mountSelect = async (mode: 'single' | 'multiple') => {
		wrapper = mount(Select, {
			props: { mode, value: mode === 'multiple' ? ['msk', 'tver'] : 'msk' },
			slots: {
				default: () => [
					h(SelectItem, { value: 'msk', text: 'Москва' }),
					h(SelectItem, { value: 'tver', text: 'Тверь' }),
				],
				tags: ({ tags, engine }: TTagsScope) =>
					h(
						Tags,
						{ ctrl: tags, engine, class: 'own-tags' },
						{ default: ({ shown }: { shown: ITagsItem[] }) => ownRow(shown) },
					),
			},
			attachTo: document.body,
		})

		await nextTick()
	}

	it('свой ряд встаёт на место встроенного и получает выбранное тегами', async () => {
		await mountSelect('multiple')

		expect(document.querySelector('.s-select__tags')).toBeNull()
		expect(find('.s-select__field .own-tags').contains(find('.own'))).toBe(true)
		expect(textsIn(find('.own'))).toEqual(['Москва', 'Тверь'])
	})

	it('закрытый в своём ряду тег снимает выбор опции', async () => {
		await mountSelect('multiple')

		find('.own .s-tags-item:first-child .s-tags-item__close').click()
		await nextTick()

		expect(textsIn(find('.own'))).toEqual(['Тверь'])
		expect(wrapper?.emitted('update:value')?.at(-1)).toEqual([['tver']])
	})

	it('без множественного выбора слота нет: тегов в поле не бывает', async () => {
		await mountSelect('single')

		expect(document.querySelector('.own-tags')).toBeNull()
	})
})
