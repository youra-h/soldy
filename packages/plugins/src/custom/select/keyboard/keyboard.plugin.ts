import { batchOf, selectOf, selectionOf } from '@soldy-ui/core'
import type { ISelect, ISelectItem, TCollectionEngine } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { fieldOf } from '../../input/field'
import { TListNavigationPlugin } from '../../list/navigation'
import type { TListEdge } from '../../list/navigation'
import { TTypeahead, itemText } from '../../list/typeahead'
import { TEditableKeyboardStrategy, TSelectOnlyKeyboardStrategy } from './strategies'
import type { ISelectKeyboardHost, ISelectKeyboardStrategy } from './strategies'
import type { ISelectKeyboardPluginOptions, TSelectKeyboardPluginEvents } from './types'

/**
 * TSelectKeyboardPlugin — клавиатура поля выбора по паттерну APG Combobox.
 *
 * Общая механика — подписка на `keydown`, привязка к коллекции, учёт
 * подсветки, циклический сдвиг, пропуск недоступных опций — в
 * `TListNavigationPlugin`. Что делают конкретные клавиши, решает выбранная
 * стратегия (`strategies/`):
 * `TSelectOnlyKeyboardStrategy` и `TEditableKeyboardStrategy` — обе поверх
 * общей части `TSelectKeyboardStrategy`. Плагин сам не проверяет
 * `owner.editable` нигде — режим выражен подпиской на `change:editable`,
 * которая переключает стратегию, а не веткой внутри обработчика.
 *
 * Ключевое свойство паттерна: **DOM-фокус никогда не уходит с поля**. Поэтому
 * `keydown` слушается на корне Select, а не на списке, и панель может быть
 * телепортирована куда угодно — на навигацию это не влияет. Подсветку для
 * скринридера передаёт `aria-activedescendant` на поле.
 *
 * Слушатель висит на корне, но клавишу комбобокс берёт только с `<input>`
 * поля. До корня всплывают и клавиши кнопки очистки, крестиков тегов и
 * содержимого слотов — что с ними делать, эти элементы знают сами: кнопка
 * делает из Enter и пробела клик. Правило отвечает на вопрос «чья клавиша», а
 * не «какая», исключений нет: с кнопки очистки не работают ни стрелки, ни
 * `Escape`. Проверка цели — здесь, а не в `TListNavigationPlugin`: база общая
 * с ListBox, у которого фокус на самом списке.
 *
 * Набор по первым буквам — правило, общее с меню (`TTypeahead`,
 * `list/typeahead.ts`): следующая за подсвеченной опция на набранное, повтор
 * буквы — по опциям на неё, без совпадения подсветка на месте. Набор живёт,
 * пока открыта панель: закрытие начинает следующий заново, как у меню.
 *
 * Прокрутки здесь нет: к подсвеченной опции и к выбранной список докручивает
 * `TListScrollPlugin` — тот же, что у ListBox и меню, — по событию подсветки
 * этого плагина (`change:highlight`) и по смене выбора.
 *
 * **В окне** (обёртка `Virtual`) клавиши ходят по всем показанным опциям, а
 * подсветка, уведённая к опции вне окна, закрепляет её в рисовании (база).
 * Своего `id` у такой опции нет, пока окно её не нарисует: ссылка
 * `aria-activedescendant` ждёт, когда опция войдёт в документ
 * (`onHighlightedMounted`), — ссылка в пустоту оставила бы скринридер немым.
 */
export class TSelectKeyboardPlugin
	extends TListNavigationPlugin<TSelectKeyboardPluginEvents, ISelectItem>
	implements ISelectKeyboardHost
{
	private _owner: ISelect | null = null
	/** `<input>` поля — единственный источник клавиш комбобокса. */
	private _input: HTMLInputElement | null = null
	private _strategy: ISelectKeyboardStrategy = new TSelectOnlyKeyboardStrategy()
	/** Набор по первым буквам; паузу набора задают опции установки. */
	private _typeahead = new TTypeahead()

	override install(ctx: IPluginContext, options?: ISelectKeyboardPluginOptions): void {
		super.install(ctx, options)

		this._typeahead = new TTypeahead(options?.typeaheadTimeout)
		this._owner = ctx.getInstance<ISelect>() ?? null

		// Поле — по общему правилу полей (`fieldOf`), так же, как у
		// `TEditablePlugin` и `TSelectBackspacePlugin`
		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element: Element) => {
			const field = fieldOf(element)

			this._input = field instanceof HTMLInputElement ? field : null
		})
		elementPlugin?.events.on('removed', () => {
			this._input = null
		})

		this._syncStrategy()
		this._listenTo(this._owner?.events, 'change:editable', () => this._syncStrategy())

		// Закрытая панель подсветку не держит: она про навигацию, а не про выбор.
		// Набор — тоже: он ищет от подсветки, и буква после закрытия начинает новый
		this._listenTo(this._owner?.events, 'close', () => {
			this._typeahead.reset()
			this.clearHighlight()
		})
	}

	override destroy(): void {
		// Снятие подсветки в `destroy()` базы снимает и ссылку с поля — пока
		// Select ещё известен: свой `ctrl` приложения переживает плагин
		super.destroy()

		this._owner = null
		this._input = null
	}

	/** Стратегия по режиму `editable` — выбор класса, а не проверка внутри. */
	private _syncStrategy(): void {
		this._strategy = this._owner?.editable
			? new TEditableKeyboardStrategy()
			: new TSelectOnlyKeyboardStrategy()
	}

	/**
	 * Подсветка сама по открытию не появляется — только по клавиатуре (см.
	 * `highlightSelected`, вызываемый из стратегий). Но раз подсветка может
	 * быть выставлена, а выдача — сузиться под отбором (`filter.query`),
	 * откуда бы он ни пришёл — из ввода в поле или из кода, — нужно следить,
	 * чтобы она не осталась на опции, которой на экране больше нет. Тогда
	 * `Enter` выбрал бы скрытое, а `aria-activedescendant` указывал бы в
	 * пустоту, поэтому подсветка переезжает на первую из оставшихся.
	 *
	 * Чинит это сам плагин, а не тот, кто поменял отбор: подсветка — его
	 * состояние, и знать о ней отбору незачем.
	 */
	protected override onEngineBound(engine: TCollectionEngine<any, any>): void {
		this._listenTo(batchOf<ISelectItem>(engine)?.events, 'change:shown', () => {
			// Подсветки нет — ставить её на смене выдачи незачем: панель может
			// быть и закрыта
			if (this._highlightedUid == null) return
			if (this.indexOf(this._highlightedUid) !== -1) return

			const first = this.items()[0]

			if (first) {
				this.highlight(first.uid)
			} else {
				this.clearHighlight()
			}
		})
	}

	/** Видимая подсветка сменилась — ссылка поля за ней. */
	protected override onHighlightChanged(_uid: string | number | null): void {
		this._refer()
	}

	/**
	 * Подсвеченная опция вошла в документ: окно дорисовало её уже после
	 * подсветки. Теперь у неё есть `id` этого монтирования — на него ссылка.
	 */
	protected override onHighlightedMounted(_uid: string | number): void {
		this._refer()
	}

	/**
	 * Набор подсвеченной опции сменился — с ним мог смениться её `id` (`id`
	 * опции в `TIdPlugin` задали, сменили или сняли): ссылка поля за ним. Подсветка та
	 * же, и прокручивать к опции снова незачем.
	 */
	protected override onHighlightedAriaChanged(_uid: string | number): void {
		this._refer()
	}

	/**
	 * `aria-activedescendant` поля — на `id` подсвеченной опции, пока она в
	 * документе (`highlightedId` базы): фокус у комбобокса на поле. Опция вне
	 * окна своего `id` не имеет, а оставшийся от прошлого монтирования указывал
	 * бы в пустоту — тогда ссылки нет, пока окно опцию не нарисует
	 * (`onHighlightedMounted`). `id` опции пишет `TOptionIdsPlugin`.
	 */
	private _refer(): void {
		this._owner?.field.aria.add('aria-activedescendant', this.highlightedId())
	}

	protected override onKeyDown(e: KeyboardEvent): void {
		// Клавиша всплыла с другого элемента под корнем: она не комбобокса
		if (e.target !== this._input) return

		const owner = this._owner

		if (!owner) return

		if (owner.open) {
			this._strategy.handleOpen(e, owner, this)
		} else {
			this._strategy.handleClosed(e, owner, this)
		}
	}

	/* ---------------------------------------------------------------- */
	/* ISelectKeyboardHost — публичный контракт для стратегий              */
	/* ---------------------------------------------------------------- */

	navigate(step: number): void {
		this.move(step)
	}

	jumpTo(edge: TListEdge): void {
		this.highlightEdge(edge)
	}

	chooseHighlighted(): void {
		if (this._highlightedUid == null) return

		const item = this.itemByUid(this._highlightedUid)

		if (item) selectOf(this._engine)?.chooseItem(item)
	}

	/**
	 * Буква набора по первым буквам: подсветка — на опцию, которую нашёл
	 * набор, а нет такой — остаётся на месте. Подсветки нет (панель открыла
	 * эта же буква) — поиск с первой опции.
	 */
	typeaheadTo(char: string): void {
		const current = this._highlightedUid == null ? null : this.itemByUid(this._highlightedUid)
		const match = this._typeahead.next(char, this.items(), current, itemText)

		if (match) this.highlight(match.uid)
	}

	emitClosedEscape(): void {
		this.events.emit('escape')
	}

	/**
	 * Подсветка встаёт на выбранную опцию — иначе на первую.
	 *
	 * Публичный метод: стратегии зовут его из закрытия и навигации, а
	 * `TEditablePlugin` — при первом открытии панели набором фильтра
	 * (`editableMode: 'filter'`), где своей клавиатурной подсказки нет. Клик и
	 * любое другое открытие без явного участника подсветку не ставят.
	 */
	highlightSelected(): void {
		const [selected] = selectionOf<ISelectItem>(this._engine)?.selected ?? []

		if (selected && this.indexOf(selected.uid) !== -1) {
			this.highlight(selected.uid)

			return
		}

		this.highlightEdge('first')
	}

	/**
	 * Подсветить первую опцию, в чьём тексте есть `needle` — в любом месте и
	 * без учёта регистра. Пустая строка и текст без совпадения снимают
	 * подсветку.
	 *
	 * Так ищет ввод в поле в режиме `search` (`TEditablePlugin`) — как отбор в
	 * режиме `filter`. Подсветка и `aria-activedescendant` и для ввода
	 * остаются здесь, в одной точке.
	 *
	 * Набор по первым буквам сюда не ходит: у него свои правила —
	 * `typeaheadTo`.
	 */
	highlightByText(needle: string): void {
		if (!needle) {
			this.clearHighlight()

			return
		}

		const lower = needle.toLowerCase()
		const match = this.items().find((item) => itemText(item).toLowerCase().includes(lower))

		if (match) {
			this.highlight(match.uid)
		} else {
			this.clearHighlight()
		}
	}
}
