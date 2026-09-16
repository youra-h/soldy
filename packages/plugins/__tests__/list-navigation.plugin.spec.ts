/**
 * `TListNavigationPlugin` — событие `change:highlight` у дженерик-базы.
 *
 * База объявлена как `TEvents extends TListNavigationPluginEvents`, и до снятия
 * приведения эмит своего события шёл через `this.events as unknown as`: карту
 * никто не сверял, и опечатка в имени или в составе аргументов прошла бы молча.
 * Теперь эмит идёт через сток (`TEventSink`), поэтому проверяется, что событие
 * доходит до подписчика наследника с суженной картой — того случая, ради
 * которого дженерик и нужен.
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
 * Тесту нужен сам канал события, а не выбор элемента.
 */
class TProbeNavigationPlugin extends TListNavigationPlugin<TProbeEvents> {
	protected onKeyDown(): void {}

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
