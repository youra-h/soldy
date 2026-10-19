import { listOf, selectionOf } from '@soldy-ui/core'
import type { IListBoxItem, TCollectionEngine } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
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
 * клавиш и смысл активации.
 *
 * `ListBox` фокусируется сам: остановка Tab — узел списка внутри корня
 * (`tabindex="0"`, на нём же роль `listbox`), а шапка и подвал стоят рядом с
 * ним. Enter и Space переключают выбор подсвеченного через расширение списка
 * (`list.chooseItem`), как и клик по строке.
 *
 * Слушатель висит на корне, но клавишу список берёт только с узла списка
 * (`listOf`) и со строки показанного элемента, на которой фокус остаётся после
 * клика. До корня всплывают и клавиши полей и кнопок из шапки, подвала и слотов
 * элемента — что с ними делать, эти элементы знают сами: поле печатает
 * пробел, кнопка делает из Enter и пробела клик. Правило отвечает на вопрос
 * «чья клавиша», а не «какая», исключений нет: из поля в шапке не работают и
 * стрелки.
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
		// Клавиша всплыла из содержимого слотов: она не списка
		if (!this._isOwnKey(e)) return

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
	 * Клавиша списка — с узла списка в корне, на котором висит слушатель, или
	 * со строки показанного элемента, в том числе недоступного. Навигация его
	 * пропускает, но фокус на его строке бывает: элемент могли выключить, пока
	 * фокус на ней, а если тема не глушит мышь на выключенной строке, фокус на
	 * неё ставит и клик, хоть и не выбирает. Если искать строку только среди
	 * доступных, стрелки с неё не работали бы.
	 *
	 * С самого корня клавиша не списка: корень — рамка вокруг шапки, списка и
	 * подвала, и остановкой Tab его делает только атрибут потребителя.
	 */
	private _isOwnKey(e: KeyboardEvent): boolean {
		const root = e.currentTarget

		if (root instanceof Element && e.target === listNodeOf(root)) return true

		return this.shown().some((item) => rowOf(this._elements, item.uid) === e.target)
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
