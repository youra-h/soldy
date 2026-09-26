/**
 * Accordion, вложенный в раскрытую секцию, — в настоящем браузере.
 *
 * Раскрытую секцию тема узнаёт по `data-selected` на её обёртке и отвечает
 * двумя правилами: поворачивает стрелку заголовка и даёт отступ панели. Оба
 * были записаны через потомка и доставали всё, что лежит в секции, — в том
 * числе секции Accordion в её содержимом. У вложенных секций стрелка стояла
 * повёрнутой, как у раскрытой, а свёрнутая вложенная не схлопывалась до конца:
 * строка сетки `0fr` сводит к нулю содержимое панели, но не её отступ, и под
 * заголовком оставалась пустая полоса. Правила раскрытой секции — только её
 * собственные: стрелка её заголовка и её панель.
 *
 * Проверки сверяют секции друг с другом, а не с числами темы: чем и на сколько
 * повёрнута стрелка раскрытой, решает тема. В jsdom каскада и раскладки нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, type VNodeChild } from 'vue'
import { Accordion, AccordionItem } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Раскрытие доигрывает, прежде чем его читают: и поворот стрелки, и высота
 * панели идут переходом, и кадр после монтирования застаёт их в начале пути.
 * `getAnimations()` сам пересчитывает стили, поэтому переход, который
 * запустило раскрытие секции, в списке уже есть.
 */
const settled = (element: Element) =>
	Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))

/** Разметка на странице, раскрытие доиграло: `TElementPlugin` ждёт кадр. */
const show = async (component: Parameters<typeof render>[0]) => {
	render(component)

	await nextTick()
	await nextFrame()
	await nextFrame()
	await settled(document.body)
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): Element => {
	const element = document.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/** Секция с меткой — по метке её и находят. У каждой есть содержимое. */
const section = (mark: string, selected: boolean, content: () => VNodeChild) =>
	h(
		AccordionItem,
		{ key: mark, value: mark, text: mark, selected, class: `s-test-${mark}` },
		{ default: content },
	)

/**
 * Два уровня: наверху раскрытая секция и свёрнутая, в содержимом раскрытой —
 * свой Accordion, тоже с раскрытой секцией и свёрнутой.
 */
const scene = defineComponent({
	render: () =>
		h('div', { style: 'width: 320px' }, [
			h(Accordion, null, () => [
				section('open', true, () =>
					h(Accordion, null, () => [
						section('nested-open', true, () => 'Содержимое'),
						section('nested-closed', false, () => 'Содержимое'),
					]),
				),
				section('closed', false, () => 'Содержимое'),
			]),
		]),
})

/**
 * Поворот стрелки секции — её собственного заголовка, а не вложенных. Оба
 * свойства: каким из них тема поворачивает стрелку, тесту знать незачем.
 */
const turn = (mark: string) => {
	const { rotate, transform } = getComputedStyle(
		find(`.s-test-${mark} > .s-accordion-item__header .s-accordion-item__arrow`),
	)

	return { rotate, transform }
}

/** Высота панели секции — её собственной. */
const height = (mark: string) =>
	find(`.s-test-${mark} > .s-accordion-item__body`).getBoundingClientRect().height

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'

	await show(scene)
})

afterEach(() => {
	cleanup()
})

describe('Accordion в раскрытой секции: правила раскрытой — только её собственные', () => {
	it('стрелка свёрнутой вложенной секции — как у свёрнутой, а не у раскрытой', () => {
		expect(turn('nested-closed')).toEqual(turn('closed'))
		expect(turn('nested-closed')).not.toEqual(turn('open'))
		expect(turn('nested-open')).toEqual(turn('open'))
	})

	it('свёрнутая вложенная секция схлопнута целиком — без пустой полосы', () => {
		expect(height('closed')).toBe(0)
		expect(height('nested-closed')).toBe(0)
		expect(height('nested-open')).toBeGreaterThan(0)
	})
})
