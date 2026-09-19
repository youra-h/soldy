import type { IControl, TCollectionEngine } from '@soldy/core'
import type { IPluginContext } from '../../../base'
import { TCollectionElements } from '../../collection'
import { TListNavigationPlugin } from '../navigation'
import type { TListKeyboardPluginEvents } from './types'

/**
 * Строка элемента внутри его узла. Корень элемента — обёртка для темы, а фокус
 * держит вложенная строка: на ней набор `aria` элемента, и в него
 * `TListBoxExtension` пишет `tabindex="-1"` (roving tabindex). Из-за этого
 * атрибута строка и может держать фокус — после клика он остаётся на ней. Роли
 * `option` у строки пока нет, поэтому строка — первый потомок узла элемента с
 * этим атрибутом.
 */
const ROW_SELECTOR = '[tabindex]'

/**
 * TListKeyboardPlugin — клавиатура самостоятельного списка (ListBox).
 *
 * Общая механика — подписка на `keydown`, привязка к коллекции, учёт
 * подсветки, циклический сдвиг — в `TListNavigationPlugin`. Здесь только то,
 * чем список отличается: набор клавиш и смысл активации.
 *
 * `ListBox` фокусируется сам (`tabindex="0"` на корне), поэтому `keydown`
 * слушается на нём же. Enter и Space переключают выбор подсвеченного через
 * расширение списка (`list.chooseItem`), как и клик по строке.
 *
 * Слушатель висит на корне, но клавишу список берёт только с самого корня и
 * со строки показанного элемента, на которой фокус остаётся после клика. До
 * корня всплывают и клавиши полей и кнопок из шапки, подвала и слотов
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
export class TListKeyboardPlugin extends TListNavigationPlugin<TListKeyboardPluginEvents> {
	/**
	 * Узлы элементов — по ним ищется строка, с которой пришла клавиша. Без
	 * этого плагина строку не узнать, и список берёт клавиши только с корня.
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
		const selected = engine.extensions.selection.selected as IControl[]

		if (selected.length > 0) this.trackHighlight(selected[0].uid)

		engine.extensions.selection.events.on('change:selection', (items: IControl[]) => {
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
	 * Клавиша списка — с корня, то есть с узла, на котором висит слушатель, или
	 * со строки показанного элемента.
	 */
	private _isOwnKey(e: KeyboardEvent): boolean {
		if (e.target === e.currentTarget) return true

		return this.items().some((item) => this._rowOf(item) === e.target)
	}

	/** Строка элемента — узел, который держит фокус внутри узла элемента. */
	private _rowOf(item: IControl): Element | null {
		return this._elements?.getElementByUid(item.uid)?.querySelector(ROW_SELECTOR) ?? null
	}

	/**
	 * Выбор идёт через расширение списка, тем же путём, что клик по строке:
	 * выключенному элементу оно отказывает. `selection.toggle` выключенность
	 * не проверяет — выбрать выключенный элемент из кода вправе приложение.
	 */
	private _toggleHighlighted(): void {
		if (this._highlightedUid == null) return

		const item = this.itemByUid(this._highlightedUid)

		if (item) this._engine?.extensions.list.chooseItem(item)
	}
}
