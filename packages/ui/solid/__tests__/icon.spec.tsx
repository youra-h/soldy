/**
 * Icon в Solid: размер из разметки, доступное имя, тег-компонент, иконка по
 * роли и тег по умолчанию.
 *
 * Сценарии — те же, что у React (`icon.spec.tsx`) и Svelte (`icon.spec.ts`):
 * размер держит плагин раскладки, имя — плагин доступного имени, а адаптер их
 * только раскладывает на корень. Забытая раскладка молча оставила бы иконку
 * без размера или без имени.
 */

import { describe, it, expect, vi } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import { TIcon } from '@soldy-ui/core'
import { getIcon } from '@soldy-ui/setup'
import { Icon, roleIcon } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

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
		const el = mount(() => <Icon tag="i" width={24} height="2em" />).root()

		expect(el.style.width).toBe('24px')
		expect(el.style.height).toBe('2em')
	})

	it('внешний ctrl с размером — тоже', () => {
		const el = mount(() => <Icon ctrl={new TIcon({ tag: 'i', width: 32 })} />).root()

		expect(el.style.width).toBe('32px')
		expect(el.style.height).toBe('')
	})

	it('без размеров атрибута style нет: размер даёт size', () => {
		const el = mount(() => <Icon tag="i" />).root()

		expect(el.hasAttribute('style')).toBe(false)
		expect(el.classList.contains('s-icon--size-normal')).toBe(true)
	})

	it('смена размера доходит до style, снятый размер его убирает', () => {
		const [width, setWidth] = createSignal<number | undefined>(24)
		const { root } = mount(() => <Icon tag="i" width={width()} />)

		setWidth(32)

		expect(root().style.width).toBe('32px')

		setWidth(undefined)

		expect(root().style.width).toBe('')
	})
})

describe('Icon · доступное имя', () => {
	it('без имени скрыта от скринридера', () => {
		// Иконка почти всегда дублирует соседний текст
		const el = mount(() => <Icon tag="i" />).root()

		expect(el.getAttribute('aria-hidden')).toBe('true')
	})

	it('с именем становится картинкой и перестаёт быть скрытой', () => {
		const el = mount(() => <Icon tag="i" aria_label="Ошибка" />).root()

		// Скрытый элемент не участвует в вычислении имени: плагин обязан снять
		// aria-hidden, поставленный ядром, а не просто добавить имя
		expect(el.hasAttribute('aria-hidden')).toBe(false)
		expect(el.getAttribute('role')).toBe('img')
		expect(el.getAttribute('aria-label')).toBe('Ошибка')
	})
})

/** SVG-иконка приложения: всё, что пришло пропсами, кладёт на свой корень. */
function Glyph(props: JSX.SvgSVGAttributes<SVGSVGElement>): JSX.Element {
	return <svg viewBox="0 0 24 24" {...props} />
}

describe('Icon · тег-компонент', () => {
	it('получает класс, стиль и ARIA и кладёт их на свой корень', () => {
		const { container } = mount(() => <Icon tag={Glyph} width={16} class="app-icon" />)
		const svg = find(container, 'svg', SVGSVGElement)

		expect(svg.getAttribute('class')).toBe('s-icon s-icon--size-normal app-icon')
		expect(svg.getAttribute('aria-hidden')).toBe('true')
		expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
		expect(svg.style.width).toBe('16px')
	})

	it('получает ref: ready приходит с его корнем', async () => {
		const onElementReady = vi.fn()
		const { container } = mount(() => <Icon tag={Glyph} onElementReady={onElementReady} />)

		await nextFrame()

		expect(onElementReady).toHaveBeenCalledWith(find(container, 'svg', SVGSVGElement))
	})
})

/**
 * Иконка по роли — компонент `roleIcon`, один на роль: корень `Icon` — `<svg>`
 * иконки из пакета, на нём атрибуты корня и `ref` адаптера.
 */
describe('Icon · иконка по роли', () => {
	it('компонент один на роль: тот же тег — то же значение', () => {
		const icon = roleIcon('arrowDown')

		expect(roleIcon('arrowDown')).toBe(icon)
		expect(roleIcon('check')).not.toBe(icon)
		expect(TIcon.getInstance(icon).tag).toBe(icon)
	})

	it('корень — <svg> иконки с классами, ARIA и размером', () => {
		const { container } = mount(() => <Icon tag={roleIcon('arrowDown')} width={20} />)
		const svg = find(container, ':scope > svg', SVGSVGElement)
		const source = getIcon('arrowDown')

		expect(svg.getAttribute('class')).toBe('s-icon s-icon--size-normal')
		expect(svg.getAttribute('aria-hidden')).toBe('true')
		expect(svg.style.width).toBe('20px')
		expect(svg.getAttribute('viewBox')).toBe(source.viewBox)
		expect(svg.innerHTML).toBe(parsed(source.body))
		// Содержимое иконки — в пространстве имён SVG, а не HTML
		expect(svg.firstElementChild?.namespaceURI).toBe('http://www.w3.org/2000/svg')
	})

	it('ready приходит с <svg> иконки', async () => {
		const onElementReady = vi.fn()
		const { container } = mount(() => (
			<Icon tag={roleIcon('check')} onElementReady={onElementReady} />
		))

		await nextFrame()

		expect(onElementReady).toHaveBeenCalledTimes(1)
		expect(onElementReady).toHaveBeenCalledWith(find(container, 'svg', SVGSVGElement))
	})

	it('с именем — картинка с ролью и именем', () => {
		const { container } = mount(() => <Icon tag={roleIcon('close')} aria_label="Закрыть" />)
		const svg = find(container, 'svg', SVGSVGElement)

		expect(svg.getAttribute('role')).toBe('img')
		expect(svg.getAttribute('aria-label')).toBe('Закрыть')
		expect(svg.hasAttribute('aria-hidden')).toBe(false)
	})

	it('смена роли через инстанс — иконка другой роли, ready с её <svg>', async () => {
		const ctrl = new TIcon({ tag: roleIcon('check') })
		const onElementReady = vi.fn()
		const { container } = mount(() => <Icon ctrl={ctrl} onElementReady={onElementReady} />)

		await nextFrame()

		ctrl.tag = roleIcon('close')
		await nextFrame()

		const svg = find(container, 'svg', SVGSVGElement)

		expect(svg.innerHTML).toBe(parsed(getIcon('close').body))
		expect(onElementReady).toHaveBeenLastCalledWith(svg)
	})

	it('смена тега со строки на роль — <svg> вместо элемента', () => {
		const ctrl = new TIcon({ tag: 'i' })
		const { container } = mount(() => <Icon ctrl={ctrl} />)

		expect(find(container, ':scope > i', HTMLElement)).toBeInstanceOf(HTMLElement)

		ctrl.tag = roleIcon('check')

		expect(container.querySelector(':scope > i')).toBeNull()
		expect(find(container, ':scope > svg', SVGSVGElement).classList.contains('s-icon')).toBe(
			true,
		)
	})
})

describe('Icon · без tag', () => {
	it('рисует span — элемент, который знает HTML', () => {
		const el = mount(() => <Icon />).root()

		expect(el.localName).toBe('span')
		expect(el.classList.contains('s-icon')).toBe(true)
	})
})
