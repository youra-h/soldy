/**
 * Вариант тега в разметке — свой, а не набора.
 *
 * В одном наборе теги бывают разного цвета: `variant` у `Tags.Item` — вход, и
 * набор его тегу не пишет (правило ядра стережёт
 * `core/__tests__/collection-style-inherit.spec.ts`). Вариант набора остаётся
 * модификатором корня набора (`s-tags--variant-<v>`): по нему тема красит тег
 * без своего варианта, а сам тег значения набора не получает. Здесь — что
 * вариант доходит до разметки в настоящем цикле Vue и смена меняет
 * модификатор; как модификаторы красят пилюлю, проверяет браузерный прогон
 * (`playground/vue/browser/tags-variant.spec.ts`).
 *
 * Значения — из фикстуры темы (`__tests__/theme.d.ts`).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Tags, TagsItem } from '@soldy-ui/vue'
import type { ITagsItem, TCollectionEngineItemSource } from '@soldy-ui/core'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Модификаторы варианта узла: по ним видно и что встало, и что снялось. */
const variantsOf = (element: Element | null, block: string): string[] =>
	[...(element?.classList ?? [])].filter((name) => name.startsWith(`${block}--variant-`))

/** Корень набора: на нём модификатор варианта набора. */
const root = (): Element | null => document.querySelector('.s-tags')

/** Элемент тега по тексту строки; нет его — тест падает здесь. */
const tag = (text: string): Element => {
	const found = [...document.querySelectorAll('.s-tags-item')].find(
		(candidate) => candidate.firstElementChild?.textContent?.trim() === text,
	)

	if (!found) throw new Error(`тега «${text}» нет`)

	return found
}

/** Модификаторы варианта тега по тексту строки. */
const tagVariants = (text: string): string[] => variantsOf(tag(text), 's-tags-item')

/**
 * Набор и два тега разметкой: у «A» вариант свой, у «B» — нет. Строковый
 * шаблон: точка в нём не работает, берём плоские имена.
 */
const MarkupHarness = {
	components: { Tags, TagsItem },
	props: {
		owner: { type: String, default: undefined },
		own: { type: String, default: undefined },
	},
	template: `
		<Tags :variant="owner">
			<TagsItem value="a" text="A" :variant="own" />
			<TagsItem value="b" text="B" />
		</Tags>
	`,
}

/** Набор с тегами из `items`: у «A» вариант свой, у «B» — нет. */
const ITEMS = [
	{ value: 'a', text: 'A', variant: 'danger' },
	{ value: 'b', text: 'B' },
] as const

/** Ключ тега для сверки состава: смена `items` обновляет те же теги. */
const byValue = (item: TCollectionEngineItemSource<ITagsItem> | ITagsItem) => item.value

describe('тег из разметки', () => {
	it('несёт свой модификатор варианта', async () => {
		wrapper = mount(MarkupHarness, { props: { own: 'danger' }, attachTo: document.body })
		await nextTick()

		expect(tagVariants('A')).toEqual(['s-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])
	})

	it('смена пропа меняет модификатор, прежний снимается', async () => {
		const mounted = mount(MarkupHarness, { props: { own: 'danger' }, attachTo: document.body })

		wrapper = mounted
		await nextTick()

		await mounted.setProps({ own: 'brand' })
		await nextTick()

		expect(tagVariants('A')).toEqual(['s-tags-item--variant-brand'])

		// Снятый проп снимает модификатор: тег снова без своего варианта
		await mounted.setProps({ own: undefined })
		await nextTick()

		expect(tagVariants('A')).toEqual([])
	})

	it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', async () => {
		const mounted = mount(MarkupHarness, {
			props: { owner: 'danger', own: 'danger' },
			attachTo: document.body,
		})

		wrapper = mounted
		await nextTick()

		expect(variantsOf(root(), 's-tags')).toEqual(['s-tags--variant-danger'])
		expect(tagVariants('A')).toEqual(['s-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])

		await mounted.setProps({ owner: 'brand' })
		await nextTick()

		// Вариант набора — на корне набора, и только там
		expect(variantsOf(root(), 's-tags')).toEqual(['s-tags--variant-brand'])
		expect(tagVariants('A')).toEqual(['s-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])

		await mounted.setProps({ owner: undefined })
		await nextTick()

		expect(variantsOf(root(), 's-tags')).toEqual([])
		expect(tagVariants('A')).toEqual(['s-tags-item--variant-danger'])
	})
})

describe('тег из items', () => {
	it('несёт свой модификатор варианта, тег без своего — никакого', async () => {
		wrapper = mount(Tags, {
			props: { variant: 'brand', items: [...ITEMS] },
			attachTo: document.body,
		})
		await nextTick()

		expect(variantsOf(root(), 's-tags')).toEqual(['s-tags--variant-brand'])
		expect(tagVariants('A')).toEqual(['s-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])
	})

	it('смена варианта в items меняет модификатор того же тега', async () => {
		const mounted = mount(Tags, {
			props: { variant: 'brand', items: [...ITEMS], trackBy: byValue },
			attachTo: document.body,
		})

		wrapper = mounted
		await nextTick()

		const before = tag('A')

		await mounted.setProps({
			items: [
				{ value: 'a', text: 'A', variant: 'brand' },
				{ value: 'b', text: 'B' },
			],
		})
		await nextTick()

		// Сверка по ключу обновила тот же тег, а не нарисовала новый
		expect(tag('A')).toBe(before)
		expect(tagVariants('A')).toEqual(['s-tags-item--variant-brand'])
		expect(tagVariants('B')).toEqual([])
	})

	it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', async () => {
		const mounted = mount(Tags, {
			props: { variant: 'danger', items: [...ITEMS] },
			attachTo: document.body,
		})

		wrapper = mounted
		await nextTick()

		await mounted.setProps({ variant: 'brand' })
		await nextTick()

		expect(variantsOf(root(), 's-tags')).toEqual(['s-tags--variant-brand'])
		expect(tagVariants('A')).toEqual(['s-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])

		await mounted.setProps({ variant: undefined })
		await nextTick()

		expect(variantsOf(root(), 's-tags')).toEqual([])
		expect(tagVariants('A')).toEqual(['s-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])
	})
})
