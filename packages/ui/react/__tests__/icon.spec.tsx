/**
 * Icon в React: размер из разметки, доступное имя и тег-компонент.
 *
 * Сценарии — те же, что у Vue (`icon-size.spec.ts`, `aria-name.spec.ts`):
 * размер держит плагин раскладки, имя — плагин доступного имени, а адаптер
 * их только раскладывает на корень. Забытая раскладка молча оставила бы
 * иконку без размера или без имени.
 *
 * Тег задан явно: умолчание ядра `error` React рисует неизвестным элементом и
 * предупреждает об этом в консоль.
 */

import { describe, it, expect, vi } from 'vitest'
import type { SVGProps } from 'react'
import { TIcon } from '@soldy-ui/core'
import { Icon } from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

describe('Icon · размер из разметки', () => {
	it('width и height стоят в style с монтирования', () => {
		const el = mount(<Icon tag="i" width={24} height="2em" />).root()

		expect(el.style.width).toBe('24px')
		expect(el.style.height).toBe('2em')
	})

	it('внешний ctrl с размером — тоже', () => {
		const el = mount(<Icon ctrl={new TIcon({ tag: 'i', width: 32 })} />).root()

		expect(el.style.width).toBe('32px')
		expect(el.style.height).toBe('')
	})

	it('без размеров атрибута style нет: размер даёт size', () => {
		const el = mount(<Icon tag="i" />).root()

		expect(el.hasAttribute('style')).toBe(false)
		expect(el.classList.contains('s-icon--size-normal')).toBe(true)
	})

	it('смена размера доходит до style, снятый размер его убирает', () => {
		const { root, render } = mount(<Icon tag="i" width={24} />)

		render(<Icon tag="i" width={32} />)

		expect(root().style.width).toBe('32px')

		render(<Icon tag="i" />)

		expect(root().style.width).toBe('')
	})
})

describe('Icon · доступное имя', () => {
	it('без имени скрыта от скринридера', () => {
		// Иконка почти всегда дублирует соседний текст
		const el = mount(<Icon tag="i" />).root()

		expect(el.getAttribute('aria-hidden')).toBe('true')
	})

	it('с именем становится картинкой и перестаёт быть скрытой', () => {
		const el = mount(<Icon tag="i" aria_label="Ошибка" />).root()

		// Скрытый элемент не участвует в вычислении имени: плагин обязан снять
		// aria-hidden, поставленный ядром, а не просто добавить имя
		expect(el.hasAttribute('aria-hidden')).toBe(false)
		expect(el.getAttribute('role')).toBe('img')
		expect(el.getAttribute('aria-label')).toBe('Ошибка')
	})
})

/** SVG-иконка приложения: всё, что пришло пропсами, кладёт на свой корень. */
function Glyph(props: SVGProps<SVGSVGElement>) {
	return <svg viewBox="0 0 24 24" {...props} />
}

describe('Icon · тег-компонент', () => {
	it('получает класс, стиль и ARIA и кладёт их на свой корень', () => {
		const { container } = mount(<Icon tag={Glyph} width={16} className="app-icon" />)
		const svg = find(container, 'svg', SVGSVGElement)

		expect(svg.getAttribute('class')).toBe('s-icon s-icon--size-normal app-icon')
		expect(svg.getAttribute('aria-hidden')).toBe('true')
		expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
		expect(svg.style.width).toBe('16px')
	})

	it('получает ref: ready приходит с его корнем', async () => {
		const onElementReady = vi.fn()
		const { container } = mount(<Icon tag={Glyph} onElementReady={onElementReady} />)

		await nextFrame()

		expect(onElementReady).toHaveBeenCalledWith(find(container, 'svg', SVGSVGElement))
	})
})
