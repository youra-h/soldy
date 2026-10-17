import { TStylable } from '../../base/stylable'
import type { TDefaultValues } from '../../base/component'
import { TAria, TClasses } from '../../../common'
import type { TComponentSize, TComponentVariant, TDatasetAttributes } from '../../../common'
import type { IMenu, IMenuProps, TMenuEvents, TMenuPlacement } from './types'

/**
 * Меню действий у кнопки — паттерн APG Menu Button.
 *
 * Корень — обёртка триггера и якорь панели, как у Popover: кнопка потребителя
 * лежит в слоте `trigger` внутри корня, и нажатие по открытому триггеру —
 * нажатие внутри владельца, панель не мигает. Панель — Frame без экземпляра в
 * ядре, поэтому обе стороны связки — наборы меню: панели — свой `aria`
 * (`role="menu"`), который разметка раскладывает на Frame, триггеру —
 * `triggerAria` в scope слота. `id` и ссылки на них пишет плагин связок
 * `TMenuIdsPlugin`: `id` нужны документу, а не меню.
 *
 * Пункты — коллекция меню (`createEngineMenu`): движок, выбор для флажков,
 * подсветка `TListItemPlugin`, навигация — наследник `TListNavigationPlugin`.
 * Что нажали, сообщает событие коллекции `choose`. Клавиатура, указатель,
 * фокус и нажатие мимо — плагины; здесь только состояние и то, что из него
 * следует для разметки.
 *
 * Размер и вариант меню панель получает своими модификаторами
 * (`panelClasses`): панель телепортирована, и модификаторы корня до неё не
 * доходят, а размер подписей групп и цвет пунктов без своего варианта тема
 * берёт с неё. Пунктам размер пишет коллекция, вариант у пункта свой.
 */
export class TMenu extends TStylable<IMenuProps, TMenuEvents> implements IMenu {
	static override baseClass = 'so-menu'

	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<IMenuProps, 'open' | 'placement'> = {
		...TStylable.defaultValues,
		// Строчный корень: меню встаёт и в строку текста, и в ряд кнопок
		tag: 'span',
		open: false,
		placement: 'bottom-start',
	}

	protected _open!: boolean
	protected _placement: TMenuPlacement
	protected _triggerAria: TAria
	protected _panelClasses: TClasses

	constructor(props: Partial<IMenuProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenu

		this._placement = props.placement ?? ctor.defaultValues.placement

		// Сторона панели связки: панель — меню. `id` и `aria-labelledby` на
		// триггер пишет `TMenuIdsPlugin` в этот же набор
		this._aria.add('role', 'menu')

		this._triggerAria = new TAria()

		this._triggerAria.events.on('change', () =>
			this.events.emit('change:triggerAria', this._triggerAria.toObject()),
		)

		this._triggerAria.add('aria-haspopup', 'menu')

		// Блок панели — свой: модификаторы ставят его методы, как модификаторы
		// корня ставит `TStylable`
		this._panelClasses = new TClasses(`${ctor.baseClass}__panel`)

		this._panelClasses.events.on('change', () =>
			this.events.emit('change:panelClasses', this._panelClasses.toArray()),
		)

		this._applyPanelSize(this.size)
		this._applyPanelVariant(this.variant)

		this.events.on('change:size', ({ newValue, oldValue }) =>
			this._applyPanelSize(newValue, oldValue),
		)
		this.events.on('change:variant', ({ newValue, oldValue }) =>
			this._applyPanelVariant(newValue, oldValue),
		)

		this._applyOpen(props.open ?? ctor.defaultValues.open)
	}

	get open(): boolean {
		return this._open
	}

	set open(value: boolean) {
		if (this._open === value) return

		this._applyOpen(value)
		this.events.emit('change:open', value)
	}

	/**
	 * Сторона и выравнивание панели у триггера. Сторону у края окна считает
	 * плагин якоря Frame (flip и shift) — здесь только выбор потребителя.
	 */
	get placement(): TMenuPlacement {
		return this._placement
	}

	set placement(value: TMenuPlacement) {
		if (this._placement === value) return

		this._placement = value
		this.events.emit('change:placement', value)
	}

	/**
	 * Сторона триггера в связке с панелью.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает панель, а это —
	 * чужой элемент, кнопка потребителя в слоте `trigger`. Экземпляра у неё
	 * нет, поэтому набор — меню (AGENTS.md, «Часть или слот»).
	 *
	 * Живой, как `aria`, потому что пишут в него двое: `aria-haspopup` и
	 * `aria-expanded` — меню, `id` и `aria-controls` — `TMenuIdsPlugin`. За
	 * границу core → ui уходит снимок (`valueOf()`), об изменении набор
	 * сообщает `change:triggerAria`.
	 */
	get triggerAria(): TAria {
		return this._triggerAria
	}

	/**
	 * Состояние триггера для темы: открытый триггер выглядит нажатым.
	 *
	 * `data-selected`, а не `data-open`, как у Popover: имя описывает вид, а
	 * не механизм. Button уже красит `[data-selected='true']` фоном нажатия
	 * своего вида, и своего CSS триггеру не нужно.
	 */
	get triggerDataset(): TDatasetAttributes {
		return { 'data-selected': this._open ? 'true' : 'false' }
	}

	/**
	 * Классы панели — блок `so-menu__panel` с размером и вариантом меню.
	 *
	 * Свой набор, а не модификаторы корня: панель — Frame, телепортированный
	 * в `body`, и до неё модификаторы корня не доходят. Разметка раскладывает
	 * снимок (`valueOf()`) на панель, об изменении набор сообщает
	 * `change:panelClasses`.
	 */
	get panelClasses(): TClasses {
		return this._panelClasses
	}

	protected _applyOpen(value: boolean): void {
		this._open = value

		this._triggerAria.add('aria-expanded', value ? 'true' : 'false')

		// Потребитель, красящий свой триггер по контексту, читает открытость с
		// корня — как у Popover
		this._dataset.add('open', value)
	}

	protected _applyPanelSize(newValue: TComponentSize, oldValue?: TComponentSize): void {
		this._panelClasses.swap({ prefix: '--size-', oldValue, newValue })
	}

	/** `swap` пропускает пустое значение: без варианта модификатора нет. */
	protected _applyPanelVariant(
		newValue: TComponentVariant | undefined,
		oldValue?: TComponentVariant,
	): void {
		this._panelClasses.swap({ prefix: '--variant-', oldValue, newValue })
	}

	override getProps(): IMenuProps {
		return {
			...super.getProps(),
			open: this._open,
			placement: this._placement,
		}
	}
}
