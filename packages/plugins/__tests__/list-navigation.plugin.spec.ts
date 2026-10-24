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
 * Событие и хук `onHighlightChanged` — одно сообщение о том, что видно на
 * экране, а не о каждом переезде позиции: по хуку клавиатура списка ведёт
 * ссылку `aria-activedescendant`, а меню — фокус, по событию список
 * докручивает к подсвеченному (`TListScrollPlugin`). Поэтому переход с
 * элемента на элемент — одно сообщение, без `null` между ними (у меню он увёл
 * бы фокус на панель), отметка на месте позиции без неё — сообщение с
 * элементом, а позиция без отметки (`trackHighlight`) переезжает и уходит
 * молча — `null` приходит, только если отметка была видна.
 *
 * Хук `onHighlightedAriaChanged` — о наборе подсвеченного элемента: в нём
 * `id`, на который ведёт ссылка, и `id` элемента в `TIdPlugin` меняется при той
 * же подсветке. База слушает набор элемента на позиции, пока она на нём, и
 * отпускает прежний, когда позиция ушла.
 */

import { describe, it, expect } from 'vitest'
import { TListBoxItem } from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'
import { TListNavigationPlugin } from '../src'
import type { TListNavigationPluginEvents, THighlightPayload } from '../src'

/** Карта наследника шире базовой — как у `TSelectKeyboardPlugin`. */
type TProbeEvents = TListNavigationPluginEvents & {
	escape: () => void
}

/**
 * Наследник без движка: показанные элементы ему задаёт тест — по ним база
 * находит соседей подсвеченного. Тесту нужен сам канал события и хука, а не
 * выбор элемента.
 */
class TProbeNavigationPlugin extends TListNavigationPlugin<TProbeEvents, IListBoxItem> {
	/** Что наследник узнал о видимой подсветке — по порядку вызовов хука. */
	readonly changes: Array<string | number | null> = []
	/** Что пришло подписчику `change:highlight` — по порядку. */
	readonly payloads: THighlightPayload[] = []
	/** О чьём наборе наследник узнал — по порядку вызовов хука. */
	readonly ariaChanges: Array<string | number> = []

	constructor(private readonly _shown: readonly IListBoxItem[]) {
		super()

		this.events.on('change:highlight', (payload) => this.payloads.push(payload))
	}

	protected override shown(): readonly IListBoxItem[] {
		return this._shown
	}

	protected onKeyDown(): void {}

	protected override onHighlightChanged(uid: string | number | null): void {
		this.changes.push(uid)
	}

	protected override onHighlightedAriaChanged(uid: string | number): void {
		this.ariaChanges.push(uid)
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

/** Три элемента списка по порядку и навигация по ним. */
function setup() {
	const [a, b, c] = ['a', 'b', 'c'].map((value) => new TListBoxItem({ value }))
	const plugin = new TProbeNavigationPlugin([a, b, c])

	return { plugin, a, b, c }
}

/** Видимой отметки больше нет — элемента и соседей нет. */
const NONE: THighlightPayload = { item: null, prevItem: null, nextItem: null }

describe('TListNavigationPlugin — change:highlight', () => {
	it('доходит до подписчика наследника с расширенной картой — элемент и соседи', () => {
		const { plugin, a, b, c } = setup()

		plugin.mark(b.uid)

		expect(plugin.payloads).toStrictEqual([{ item: b, prevItem: a, nextItem: c }])
		expect(plugin.highlightedUid).toBe(b.uid)
	})

	it('у края соседа нет', () => {
		const { plugin, a, b } = setup()

		plugin.mark(a.uid)

		expect(plugin.payloads).toStrictEqual([{ item: a, prevItem: null, nextItem: b }])
	})

	it('снятие видимой подсветки шлёт событие с пустыми соседями', () => {
		const { plugin, a } = setup()

		plugin.mark(a.uid)
		plugin.clear()

		expect(plugin.payloads.at(-1)).toStrictEqual(NONE)
		expect(plugin.highlightedUid).toBeNull()
	})

	it('позиция без отметки переезжает молча', () => {
		const { plugin, a, b } = setup()

		plugin.track(a.uid)
		plugin.track(b.uid)

		expect(plugin.payloads).toEqual([])
		expect(plugin.highlightedUid).toBe(b.uid)
	})

	it('позиция без отметки снимается молча', () => {
		const { plugin, a } = setup()

		plugin.track(a.uid)
		plugin.clear()

		expect(plugin.payloads).toEqual([])
		expect(plugin.highlightedUid).toBeNull()
	})

	/**
	 * Позиция уже на элементе, но без отметки — так стрелка приходит к
	 * единственному доступному элементу, на котором позиция стоит за выбором.
	 * Отметка встаёт на месте, и событие уходит: на экране подсветка появилась,
	 * хоть позиция и не сменилась. Повторная отметка ничего не меняет.
	 */
	it('отметка на позиции без неё — одно событие с элементом; повтор — молча', () => {
		const { plugin, a, b } = setup()

		plugin.track(a.uid)
		plugin.mark(a.uid)
		plugin.mark(a.uid)

		expect(plugin.payloads).toStrictEqual([{ item: a, prevItem: null, nextItem: b }])
		expect(plugin.highlightedUid).toBe(a.uid)
	})

	it('позиция ушла без отметки, когда отметка была видна, — одно событие с null', () => {
		const { plugin, a, b, c } = setup()

		plugin.mark(a.uid)
		plugin.track(b.uid)
		plugin.track(c.uid)

		expect(plugin.payloads).toStrictEqual([{ item: a, prevItem: null, nextItem: b }, NONE])
		expect(plugin.highlightedUid).toBe(c.uid)
	})
})

describe('TListNavigationPlugin — onHighlightChanged', () => {
	it('подсветка A → B — по вызову на элемент, без null между ними', () => {
		const { plugin, a, b } = setup()

		plugin.mark(a.uid)
		plugin.mark(b.uid)

		expect(plugin.changes).toEqual([a.uid, b.uid])
	})

	it('позиция ушла без отметки, когда отметка была видна, — один null', () => {
		const { plugin, a, b, c } = setup()

		plugin.mark(a.uid)
		plugin.track(b.uid)
		plugin.track(c.uid)

		expect(plugin.changes).toEqual([a.uid, null])
	})

	it('без отметки позиция переезжает молча', () => {
		const { plugin, a, b } = setup()

		plugin.track(a.uid)
		plugin.track(b.uid)

		expect(plugin.changes).toEqual([])
	})

	it('отметка с позиции без неё — элемент; снятие — null', () => {
		const { plugin, a, b } = setup()

		plugin.track(a.uid)
		plugin.mark(b.uid)
		plugin.clear()

		expect(plugin.changes).toEqual([b.uid, null])
	})

	it('отметка на позиции без неё — элемент; повтор — молча; уход позиции — null', () => {
		const { plugin, a, b } = setup()

		plugin.track(a.uid)
		plugin.mark(a.uid)
		plugin.mark(a.uid)
		plugin.track(b.uid)

		expect(plugin.changes).toEqual([a.uid, null])
	})

	/** Событие и хук — одно сообщение: то же число, тот же элемент, тем же порядком. */
	it('хук и событие приходят вместе', () => {
		const { plugin, a, b, c } = setup()

		plugin.track(a.uid)
		plugin.mark(b.uid)
		plugin.mark(c.uid)
		plugin.track(a.uid)
		plugin.mark(a.uid)
		plugin.clear()

		expect(plugin.payloads.map(({ item }) => item?.uid ?? null)).toEqual(plugin.changes)
		expect(plugin.changes).toEqual([b.uid, c.uid, null, a.uid, null])
	})
})

describe('TListNavigationPlugin — onHighlightedAriaChanged', () => {
	it('набор подсвеченного сменился — хук с ним, подсветка та же', () => {
		const { plugin, a } = setup()

		plugin.mark(a.uid)
		a.aria.add('id', 'row-a')

		expect(plugin.ariaChanges).toEqual([a.uid])
		expect(plugin.changes).toEqual([a.uid])
	})

	it('позиция ушла — набор прежнего не слушается, нового — слушается', () => {
		const { plugin, a, b } = setup()

		plugin.mark(a.uid)
		plugin.mark(b.uid)
		a.aria.add('id', 'row-a')

		expect(plugin.ariaChanges).toEqual([])

		b.aria.add('id', 'row-b')

		expect(plugin.ariaChanges).toEqual([b.uid])
	})

	it('без отметки ссылки нет — и хук молчит', () => {
		const { plugin, a } = setup()

		plugin.track(a.uid)
		a.aria.add('id', 'row-a')

		expect(plugin.ariaChanges).toEqual([])
	})

	it('подсветку сняли или навигацию уничтожили — набор не слушается', () => {
		const { plugin, a, b } = setup()

		plugin.mark(a.uid)
		plugin.clear()
		a.aria.add('id', 'row-a')

		plugin.mark(b.uid)
		plugin.destroy()
		b.aria.add('id', 'row-b')

		expect(plugin.ariaChanges).toEqual([])
	})
})
