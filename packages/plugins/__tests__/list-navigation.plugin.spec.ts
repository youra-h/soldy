/**
 * `TListNavigationPlugin` — событие `change:highlight` у дженерик-базы и хук
 * наследника о видимой подсветке.
 *
 * База объявлена как `TEvents extends TListNavigationPluginEvents`, и до снятия
 * приведения эмит своего события шёл через `this.events as unknown as`: карту
 * никто не сверял, и опечатка в имени или в составе аргументов прошла бы молча.
 * Теперь эмит идёт через сток (`TEventSink`), поэтому проверяется, что событие
 * доходит до подписчика наследника с суженной картой — того случая, ради
 * которого дженерик и нужен.
 *
 * Хук `onHighlightChanged` — о том, что видно на экране, а не о каждом переезде
 * позиции: по нему клавиатура списка ведёт ссылку `aria-activedescendant`, а
 * меню — фокус. Поэтому переход с элемента на элемент — один вызов, без `null`
 * между ними (у меню он увёл бы фокус на панель), а позиция, ушедшая без
 * отметки (`trackHighlight`), сообщает `null`, только если отметка была видна.
 */

import { describe, it, expect, vi } from 'vitest'
import { TListNavigationPlugin } from '../src'
import type { TListNavigationPluginEvents, THighlightPayload } from '../src'

/** Карта наследника шире базовой — как у `TSelectKeyboardPlugin`. */
type TProbeEvents = TListNavigationPluginEvents & {
	escape: () => void
}

/**
 * Наследник без движка: `items()` пуст, поэтому соседи приходят `null`.
 * Тесту нужен сам канал события и хука, а не выбор элемента.
 */
class TProbeNavigationPlugin extends TListNavigationPlugin<TProbeEvents> {
	/** Что наследник узнал о видимой подсветке — по порядку вызовов хука. */
	readonly changes: Array<string | number | null> = []

	protected onKeyDown(): void {}

	protected override onHighlightChanged(uid: string | number | null): void {
		this.changes.push(uid)
	}

	mark(uid: string | number): void {
		this.highlight(uid)
	}

	track(uid: string | number): void {
		this.trackHighlight(uid)
	}

	clear(): void {
		this.clearHighlight()
	}
}

describe('TListNavigationPlugin — change:highlight', () => {
	it('доходит до подписчика наследника с расширенной картой', () => {
		const plugin = new TProbeNavigationPlugin()
		const onHighlight = vi.fn<TProbeEvents['change:highlight']>()

		plugin.events.on('change:highlight', onHighlight)
		plugin.track('a')

		const payload: THighlightPayload = { item: null, prevItem: null, nextItem: null }

		expect(onHighlight.mock.calls).toStrictEqual([[payload]])
		expect(plugin.highlightedUid).toBe('a')
	})

	it('снятие подсветки шлёт событие с пустыми соседями', () => {
		const plugin = new TProbeNavigationPlugin()
		const seen: THighlightPayload[] = []

		plugin.track('a')
		plugin.events.on('change:highlight', (payload) => seen.push(payload))
		plugin.clear()

		expect(seen).toStrictEqual([{ item: null, prevItem: null, nextItem: null }])
		expect(plugin.highlightedUid).toBeNull()
	})
})

describe('TListNavigationPlugin — onHighlightChanged', () => {
	it('подсветка A → B — по вызову на элемент, без null между ними', () => {
		const plugin = new TProbeNavigationPlugin()

		plugin.mark('a')
		plugin.mark('b')

		expect(plugin.changes).toEqual(['a', 'b'])
	})

	it('позиция ушла без отметки, когда отметка была видна, — один null', () => {
		const plugin = new TProbeNavigationPlugin()

		plugin.mark('a')
		plugin.track('b')
		plugin.track('c')

		expect(plugin.changes).toEqual(['a', null])
		expect(plugin.highlightedUid).toBe('c')
	})

	it('без отметки позиция переезжает молча', () => {
		const plugin = new TProbeNavigationPlugin()

		plugin.track('a')
		plugin.track('b')

		expect(plugin.changes).toEqual([])
		expect(plugin.highlightedUid).toBe('b')
	})

	it('отметка с позиции без неё — элемент; снятие — null', () => {
		const plugin = new TProbeNavigationPlugin()

		plugin.track('a')
		plugin.mark('b')
		plugin.clear()

		expect(plugin.changes).toEqual(['b', null])
	})
})
