import { listOf, selectionOf } from '@soldy-ui/core'
import type { IListBoxItem, TCollectionEngine } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { isFocusableElement } from '../../../utils'
import { TCollectionElements } from '../../collection'
import { TListNavigationPlugin } from '../navigation'
// Одноимённый узел списка: `listOf` в этом файле — охранник расширения
// списка, и различает их алиас в импорте
import { listOf as listNodeOf, rowOf } from '../row'
import type { TListKeyboardPluginEvents } from './types'

/**
 * TListKeyboardPlugin — клавиатура самостоятельного списка (ListBox).
 *
 * Общая механика — подписка на `keydown`, привязка к коллекции, учёт
 * подсветки, циклический сдвиг, пропуск недоступных элементов — в
 * `TListNavigationPlugin`. Здесь только то, чем список отличается: набор
 * клавиш, смысл активации и модель фокуса.
 *
 * `ListBox` фокусируется сам: остановка Tab — узел списка внутри корня
 * (`tabindex="0"`, на нём же роль `listbox`), а шапка и подвал стоят рядом с
 * ним. DOM-фокус держит узел списка — кольцо темы у него, — а элемент под
 * стрелками показывает подсветка (`data-highlighted`). Enter и Space
 * переключают выбор подсвеченного через расширение списка
 * (`list.chooseItem`), как и клик по строке.
 *
 * Слушатель висит на корне, но клавишу список берёт только с узла списка
 * (`listOf`) и со строки показанного элемента. До корня всплывают и клавиши
 * полей и кнопок из шапки, подвала и слотов элемента — что с ними делать, эти
 * элементы знают сами: поле печатает пробел, кнопка делает из Enter и пробела
 * клик. Правило отвечает на вопрос «чья клавиша», а не «какая», исключений
 * нет: из поля в шапке не работают и стрелки.
 *
 * **Строка держит фокус после клика только до первой клавиши.** У строки
 * `tabindex="-1"`, и фокус на неё ставят клик и запись `focused = true`
 * элемента. Клавиша с неё — клавиша списка с места этой строки: позиция
 * встаёт на элемент строки, фокус возвращается узлу списка, и дальше клавиша
 * идёт так же, как с узла (`_fromRow`). Останься фокус на строке, после
 * клавиши браузер включил бы ей `:focus-visible`, и кольцо строки висело бы до
 * ухода из списка, пока подсветка ходит по другим элементам. Правило — для
 * любой клавиши, а не только для стрелок, Enter и пробела: Tab со строки идёт
 * от узла списка, и Shift+Tab выводит из ListBox одним нажатием, а не
 * останавливается на самом узле — предке строки.
 *
 * Цель сравнивается со строкой на равенство, а не через `contains`, как у
 * табов (`TTabsKeyboardPlugin`): там кнопка закрытия — часть таба, а в строке
 * ListBox лежат только слоты потребителя, и их клавиши принадлежат им. Проверка
 * цели — здесь, а не в `TListNavigationPlugin`: база общая с Select, у которого
 * своё правило — клавиши только с поля.
 */
export class TListKeyboardPlugin extends TListNavigationPlugin<
	TListKeyboardPluginEvents,
	IListBoxItem
> {
	/**
	 * Узлы элементов — по ним ищется строка, с которой пришла клавиша. Без
	 * этого плагина строку не узнать, и список берёт клавиши только с узла
	 * списка.
	 */
	private _elements: TCollectionElements | null = null

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._elements = ctx.get(TCollectionElements) ?? null
	}

	override destroy(): void {
		this._elements = null

		super.destroy()
	}

	/**
	 * Подсветка встаёт на выбранный элемент — и следует за ним, если выбор
	 * поменяли снаружи. Позиция запоминается без визуальной отметки: список
	 * ещё не в навигации.
	 */
	protected override onEngineBound(engine: TCollectionEngine<any, any>): void {
		const selection = selectionOf<IListBoxItem>(engine)
		const selected = selection?.selected ?? []

		if (selected.length > 0) this.trackHighlight(selected[0].uid)

		this._listenTo(selection?.events, 'change:selection', (items) => {
			if (items.length > 0) this.trackHighlight(items[0].uid)
		})
	}

	protected override onKeyDown(e: KeyboardEvent): void {
		const root = e.currentTarget
		const list = root instanceof Element ? listNodeOf(root) : null

		if (e.target !== list) {
			const item = this._rowItemOf(e.target)

			// Клавиша всплыла из содержимого слотов или пришла с самого корня: она
			// не списка
			if (!item) return

			this._fromRow(item, list)
		}

		if (!this._engine) return
		if (this.items().length === 0) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				this.move(1)

				return

			case 'ArrowUp':
				e.preventDefault()
				this.move(-1)

				return

			case 'Enter':
			case ' ':
				e.preventDefault()
				this._toggleHighlighted()

				return
		}
	}

	/**
	 * Показанный элемент, со строки которого пришла клавиша, — в том числе
	 * недоступный. Навигация его пропускает, но фокус на его строке бывает:
	 * элемент могли выключить, пока фокус на ней, а если тема не глушит мышь на
	 * выключенной строке, фокус на неё ставит и клик, хоть и не выбирает. Если
	 * искать строку только среди доступных, клавиши с неё не работали бы.
	 *
	 * `null` — клавиша не со строки: из содержимого слотов или с самого корня.
	 * Корень — рамка вокруг шапки, списка и подвала, и остановкой Tab его
	 * делает только атрибут потребителя.
	 */
	private _rowItemOf(target: EventTarget | null): IListBoxItem | null {
		return this.shown().find((item) => rowOf(this._elements, item.uid) === target) ?? null
	}

	/**
	 * Клавиша со строки: позиция — на элемент строки, без отметки, как за
	 * выбором, фокус — узлу списка. Дальше клавиша идёт так же, как с узла:
	 * стрелка шагает от строки, а не от прежней позиции (в `multiple` та стоит
	 * на первом выбранном), Enter и пробел переключают элемент строки, Tab
	 * уходит от узла.
	 *
	 * Позиция — раньше фокуса: окно (`Virtual`) держит строку под фокусом
	 * нарисованной, и уход фокуса это закрепление снимает, а позиция к тому
	 * времени уже закрепила элемент строки сама.
	 *
	 * Фокус переходит во время нажатия клавиши, поэтому `:focus-visible`
	 * браузер включает узлу списка, как после Tab, а кольцо строки гаснет
	 * вместе с её фокусом. Без прокрутки: строка, с которой пришла клавиша, на
	 * экране, а докрутка к узлу списка сдвинула бы страницу. Узла нет —
	 * фокус остаётся на месте, но клавиша всё равно идёт от строки.
	 */
	private _fromRow(item: IListBoxItem, list: Element | null): void {
		this.trackHighlight(item.uid)

		if (isFocusableElement(list)) list.focus({ preventScroll: true })
	}

	/**
	 * Выбор идёт через расширение списка, тем же путём, что клик по строке:
	 * выключенному элементу оно отказывает. `selection.toggle` выключенность
	 * не проверяет — выбрать выключенный элемент из кода вправе приложение.
	 *
	 * Подсвеченный элемент ищется среди доступных (`items()`), поэтому
	 * выключенный или скрытый после подсветки до расширения и не доходит.
	 */
	private _toggleHighlighted(): void {
		if (this._highlightedUid == null) return

		const item = this.itemByUid(this._highlightedUid)

		if (item) listOf(this._engine)?.chooseItem(item)
	}
}
