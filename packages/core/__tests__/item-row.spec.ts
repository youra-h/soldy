/**
 * `TItemRow` — кнопка, чью роль и остановку Tab пишет владелец набором
 * `aria` на том же узле: строка элемента коллекции — тега, элемента ListBox,
 * опции Select и пункта меню, — которую элемент отдаёт кнопке через `ctrl`.
 *
 * По устройству это `TButton` — блок, слоты, `press`, — а `role` и `tabindex`
 * она себе не пишет ни на каком теге. `TButton` на `div` объявляет себя
 * кнопкой и остановкой Tab, и строка без действия принимала фокус от клика,
 * хотя владелец гасил её остановку `tabindex="-1"`.
 */

import { describe, it, expect, vi } from 'vitest'
import { TButton, TItemRow, TListBoxItem, TMenuItem, TSelectItem, TTagsItem } from '../src'
import type { IButton, TComponentSize } from '../src'

/** Что тест трогает у владельца строки — у четырёх классов это общее. */
type TRowOwner = {
	readonly row: IButton
	size: TComponentSize
	/** Шина владельца: шпионы видят, заводит ли чтение строки подписки. */
	readonly events: {
		on: (...args: never[]) => unknown
		use: (...args: never[]) => unknown
		listen: (...args: never[]) => unknown
	}
}

/** Владельцы строки: у каждого своя `row`, и тег у неё свой. */
const OWNERS: ReadonlyArray<readonly [string, () => TRowOwner, string]> = [
	['Tags.Item', () => new TTagsItem({ value: 'a' }), 'div'],
	['ListBox.Item', () => new TListBoxItem({ value: 'a' }), 'div'],
	['Select.Item', () => new TSelectItem({ value: 'a' }), 'span'],
	['Menu.Item', () => new TMenuItem({ value: 'a' }), 'div'],
]

/**
 * Строку создаёт первое чтение (`row`), а пишут ей подписки владельца,
 * заведённые конструктором. Читает строку монтирование, а элемент из данных и
 * `ctrl` живут дольше него, поэтому чтение не заводит на элементе ничего:
 * снятое монтирование иначе оставляло бы на нём подписки (сторожа
 * `external-lifetime` адаптеров).
 */
describe.each(OWNERS)('%s · строка с первого чтения', (_name, create, tag) => {
	it('чтение строки подписок на элементе не заводит', () => {
		const owner = create()
		const on = vi.spyOn(owner.events, 'on')
		const use = vi.spyOn(owner.events, 'use')
		const listen = vi.spyOn(owner.events, 'listen')

		expect(owner.row).toBeInstanceOf(TItemRow)
		expect(owner.row.tag).toBe(tag)

		expect(on).not.toHaveBeenCalled()
		expect(use).not.toHaveBeenCalled()
		expect(listen).not.toHaveBeenCalled()
	})

	it('смены до чтения строки — в её стартовых значениях, после — в ней самой', () => {
		const owner = create()

		owner.size = 'sm'

		const row = owner.row

		expect(row.size).toBe('sm')

		owner.size = 'lg'

		expect(row.size).toBe('lg')
	})
})

describe('TItemRow · роль и остановка Tab — у владельца', () => {
	it.each(['div', 'span', 'button'])('на %s ни role, ни tabindex', (tag) => {
		const button = new TItemRow({ tag })

		expect(button.aria.has('role')).toBe(false)
		expect(button.aria.has('tabindex')).toBe(false)
	})

	it('смена тега и выключение их не возвращают', () => {
		const button = new TItemRow({ tag: 'div' })

		button.tag = 'span'
		button.disabled = true
		button.disabled = false
		button.tag = 'button'
		button.tag = 'div'

		expect(button.aria.toObject()).toEqual({})
	})

	it('aria-disabled — как у TButton: это состояние самой кнопки', () => {
		const row = new TItemRow({ tag: 'div', disabled: true })
		const button = new TButton({ tag: 'div', disabled: true })

		expect(row.aria.get('aria-disabled')).toBe('true')
		expect(row.aria.get('aria-disabled')).toBe(button.aria.get('aria-disabled'))

		row.disabled = false

		expect(row.aria.has('aria-disabled')).toBe(false)
	})

	it('на нативной кнопке — нативный disabled, как у TButton', () => {
		const row = new TItemRow({ disabled: true })

		expect(row.tag).toBe('button')
		expect(row.attrs.get('disabled')).toBe('disabled')
		expect(row.aria.has('aria-disabled')).toBe(false)
	})

	it('остальное — кнопки: блок so-button, текст, вид', () => {
		const button = new TItemRow({ tag: 'div', text: 'Почта', view: 'ghost' })

		expect(button).toBeInstanceOf(TButton)
		expect(button.classes.toArray()).toEqual(
			expect.arrayContaining(['so-button', 'so-button--view-ghost']),
		)
		expect(button.text).toBe('Почта')
	})
})
