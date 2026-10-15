/**
 * Icon в Svelte: размер из разметки, доступное имя, тег-компонент, иконка по
 * роли и тег по умолчанию.
 *
 * Сценарии — те же, что у React (`icon.spec.tsx`) и Vue: размер держит плагин
 * раскладки, имя — плагин доступного имени, а адаптер их только раскладывает
 * на корень. Забытая раскладка молча оставила бы иконку без размера или без
 * имени.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { TIcon } from '@soldy-ui/core'
import { getIcon } from '@soldy-ui/setup'
import { Icon, roleIcon, type IconProps } from '@soldy-ui/svelte'
import Glyph from './Glyph.test.svelte'
import { find, mount, nextFrame, readyProbe } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/**
 * Содержимое иконки так, как его разбирает документ: SVG внутри HTML jsdom
 * пишет с закрывающими тегами (`<path></path>`), а пакет — самозакрытыми.
 */
function parsed(body: string): string {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

	svg.innerHTML = body

	return svg.innerHTML
}

describe('Icon · размер из разметки', () => {
	it('width и height стоят в style с монтирования', () => {
		const el = mount(Icon, { tag: 'i', width: 24, height: '2em' }).root()

		expect(el.style.width).toBe('24px')
		expect(el.style.height).toBe('2em')
	})

	it('внешний ctrl с размером — тоже', () => {
		const el = mount(Icon, { ctrl: new TIcon({ tag: 'i', width: 32 }) }).root()

		expect(el.style.width).toBe('32px')
		expect(el.style.height).toBe('')
	})

	it('без размеров атрибута style нет: размер даёт size', () => {
		const el = mount(Icon, { tag: 'i' }).root()

		expect(el.hasAttribute('style')).toBe(false)
		expect(el.classList.contains('so-icon--size-normal')).toBe(true)
	})

	it('смена размера доходит до style, снятый размер его убирает', () => {
		const props = reactiveProps<IconProps>({ tag: 'i', width: 24 })
		const { root } = mount(Icon, props)

		props.width = 32
		flushSync()

		expect(root().style.width).toBe('32px')

		props.width = undefined
		flushSync()

		expect(root().style.width).toBe('')
	})
})

describe('Icon · доступное имя', () => {
	it('без имени скрыта от скринридера', () => {
		// Иконка почти всегда дублирует соседний текст
		const el = mount(Icon, { tag: 'i' }).root()

		expect(el.getAttribute('aria-hidden')).toBe('true')
	})

	it('с именем становится картинкой и перестаёт быть скрытой', () => {
		const el = mount(Icon, { tag: 'i', aria_label: 'Ошибка' }).root()

		// Скрытый элемент не участвует в вычислении имени: плагин обязан снять
		// aria-hidden, поставленный ядром, а не просто добавить имя
		expect(el.hasAttribute('aria-hidden')).toBe(false)
		expect(el.getAttribute('role')).toBe('img')
		expect(el.getAttribute('aria-label')).toBe('Ошибка')
	})
})

describe('Icon · тег-компонент', () => {
	it('получает класс, стиль и ARIA и кладёт их на свой корень', () => {
		const { container } = mount(Icon, { tag: Glyph, width: 16, class: 'app-icon' })
		const svg = find(container, 'svg', SVGSVGElement)

		expect(svg.getAttribute('class')).toBe('so-icon so-icon--size-normal app-icon')
		expect(svg.getAttribute('aria-hidden')).toBe('true')
		expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
		expect(svg.style.width).toBe('16px')
	})

	it('получает привязку корня: ready приходит с его корнем', async () => {
		const ready = readyProbe()
		const { container } = mount(Icon, { tag: Glyph, onElementReady: ready.onElementReady })

		await nextFrame()

		expect(ready.elements).toHaveLength(1)
		expect(ready.elements[0]).toBe(find(container, 'svg', SVGSVGElement))
	})
})

/**
 * Иконка по роли — метка `roleIcon`, а не компонент: Svelte компонента на
 * лету не соберёт. Корень узнаёт метку и рисует `<svg>` иконки из пакета.
 */
describe('Icon · иконка по роли', () => {
	it('метка одна на роль и без ключа tag: TIcon.getInstance не примет её за пропсы', () => {
		const mark = roleIcon('arrowDown')

		expect(roleIcon('arrowDown')).toBe(mark)
		expect(roleIcon('check')).not.toBe(mark)
		expect('tag' in mark).toBe(false)
		expect(Object.isFrozen(mark)).toBe(true)
		expect(TIcon.getInstance(mark).tag).toBe(mark)
	})

	it('корень — <svg> иконки с классами, ARIA и размером', () => {
		const { container } = mount(Icon, { tag: roleIcon('arrowDown'), width: 20 })
		const svg = find(container, ':scope > svg', SVGSVGElement)
		const source = getIcon('arrowDown')

		expect(svg.getAttribute('class')).toBe('so-icon so-icon--size-normal')
		expect(svg.getAttribute('aria-hidden')).toBe('true')
		expect(svg.style.width).toBe('20px')
		expect(svg.getAttribute('viewBox')).toBe(source.viewBox)
		expect(svg.innerHTML).toBe(parsed(source.body))
		// Содержимое иконки — в пространстве имён SVG, а не HTML
		expect(svg.firstElementChild?.namespaceURI).toBe('http://www.w3.org/2000/svg')
	})

	it('ready приходит с <svg> иконки', async () => {
		const ready = readyProbe()
		const { container } = mount(Icon, {
			tag: roleIcon('check'),
			onElementReady: ready.onElementReady,
		})

		await nextFrame()

		expect(ready.elements).toHaveLength(1)
		expect(ready.elements[0]).toBe(find(container, 'svg', SVGSVGElement))
	})

	it('с именем — картинка с ролью и именем', () => {
		const { container } = mount(Icon, { tag: roleIcon('close'), aria_label: 'Закрыть' })
		const svg = find(container, 'svg', SVGSVGElement)

		expect(svg.getAttribute('role')).toBe('img')
		expect(svg.getAttribute('aria-label')).toBe('Закрыть')
		expect(svg.hasAttribute('aria-hidden')).toBe(false)
	})

	it('смена роли через инстанс — иконка другой роли, ready с её <svg>', async () => {
		const ctrl = new TIcon({ tag: roleIcon('check') })
		const ready = readyProbe()
		const { container } = mount(Icon, { ctrl, onElementReady: ready.onElementReady })

		await nextFrame()

		ctrl.tag = roleIcon('close')
		flushSync()
		await nextFrame()

		const svg = find(container, 'svg', SVGSVGElement)

		expect(svg.innerHTML).toBe(parsed(getIcon('close').body))
		expect(ready.elements.at(-1)).toBe(svg)
	})

	it('смена тега со строки на метку — <svg> вместо элемента', () => {
		const ctrl = new TIcon({ tag: 'i' })
		const { container } = mount(Icon, { ctrl })

		expect(find(container, ':scope > i', HTMLElement)).toBeInstanceOf(HTMLElement)

		ctrl.tag = roleIcon('check')
		flushSync()

		expect(container.querySelector(':scope > i')).toBeNull()
		expect(find(container, ':scope > svg', SVGSVGElement).classList.contains('so-icon')).toBe(
			true,
		)
	})
})

describe('Icon · без tag', () => {
	it('рисует span — элемент, который знает HTML', () => {
		const el = mount(Icon, {}).root()

		expect(el.localName).toBe('span')
		expect(el.classList.contains('so-icon')).toBe(true)
	})
})
