import { TStylable } from '../../base/stylable'
import type { TDefaultValues } from '../../base/component'
import { TAria, TClasses } from '../../../common'
import type { TComponentSize, TComponentVariant, TDatasetAttributes } from '../../../common'
import type {
	IMenu,
	IMenuProps,
	TMenuEvents,
	TMenuOpenOn,
	TMenuPlacement,
	TMenuPoint,
} from './types'
import type { IMenuItem } from './item/types'

/** Одна ли это точка: координаты те же, или точки нет у обеих. */
const samePoint = (a: TMenuPoint | null, b: TMenuPoint | null): boolean =>
	a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y)

/**
 * Меню действий у кнопки — паттерн APG Menu Button — или контекстное меню
 * области (`openOn`).
 *
 * Корень — обёртка триггера и якорь панели, как у Popover: кнопка потребителя
 * лежит в слоте `trigger` внутри корня, и нажатие по открытому триггеру —
 * нажатие внутри владельца, панель не мигает. Панель — Frame без экземпляра в
 * ядре, поэтому обе стороны связки — наборы меню: панели — свой `aria`
 * (`role="menu"`), который разметка раскладывает на Frame, триггеру —
 * `triggerAria` в scope слота. `id` и ссылки на них пишет плагин связок
 * `TMenuIdsPlugin`: `id` нужны документу, а не меню.
 *
 * Контекстное меню — режим того же меню, а не отдельный компонент: панель,
 * пункты, клавиши и фокус те же, различаются способ открытия и якорь. В слоте
 * `trigger` тогда область — строка, файл, картинка, — и панель встаёт у
 * точки вызова (`point`), а не у корня. Точку пишет плагин открытия, разметка
 * отдаёт её якорю панели. Связки «кнопка ↔ меню» у области нет: она не
 * кнопка, и паттерна APG у контекстного меню нет.
 *
 * Пункты — коллекция меню (`createEngineMenu`): движок, выбор для флажков,
 * подсветка `TListItemPlugin`, навигация — наследник `TListNavigationPlugin`.
 * Что нажали, сообщает событие коллекции `choose` — и о пунктах подменю: у
 * пункта с подменю (`TMenuSubmenu`) своя коллекция, а выбор в ней доходит до
 * меню и закрывает его целиком (`notifyChoose`). Клавиатура, указатель,
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
		TDefaultValues<IMenuProps, 'open' | 'placement' | 'openOn'> = {
		...TStylable.defaultValues,
		// Строчный корень: меню встаёт и в строку текста, и в ряд кнопок
		tag: 'span',
		open: false,
		placement: 'bottom-start',
		openOn: 'press',
	}

	protected _open!: boolean
	protected _placement: TMenuPlacement
	protected _openOn: TMenuOpenOn
	protected _point: TMenuPoint | null = null
	protected _triggerAria: TAria
	protected _panelClasses: TClasses

	constructor(props: Partial<IMenuProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenu

		this._placement = props.placement ?? ctor.defaultValues.placement
		this._openOn = props.openOn ?? ctor.defaultValues.openOn

		// Сторона панели связки: панель — меню. `id` и `aria-labelledby` на
		// триггер пишет `TMenuIdsPlugin` в этот же набор
		this._aria.add('role', 'menu')

		this._triggerAria = new TAria()

		this._triggerAria.events.on('change', () =>
			this.events.emit('change:triggerAria', this._triggerAria.toObject()),
		)

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
	 * Пункт-действие выбрали — в панели меню или в любом его подменю: меню
	 * закрывается целиком. Открытые подменю и панели пунктов закрывает его
	 * коллекция, когда закрылось само меню, а фокус возвращает на триггер
	 * модель фокуса.
	 */
	notifyChoose(_item: IMenuItem): void {
		this.open = false
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
	 * Чем меню открывают: нажатием кнопки (`press`) или как контекстное меню
	 * области (`contextmenu`). Что именно открывает меню в каждом режиме,
	 * решают плагины открытия и клавиатуры — здесь выбор потребителя и то,
	 * что из него следует для разметки: связка триггера с панелью есть только
	 * у кнопки.
	 *
	 * Смена режима снимает точку вызова: она — место, где вызвали контекстное
	 * меню, и кнопке, которая открывает меню у себя, ни к чему.
	 */
	get openOn(): TMenuOpenOn {
		return this._openOn
	}

	set openOn(value: TMenuOpenOn) {
		if (this._openOn === value) return

		this._openOn = value
		this.point = null
		this._syncTriggerAria()
		this.events.emit('change:openOn', value)
	}

	/**
	 * Точка вызова контекстного меню в координатах окна — у неё встаёт
	 * панель: прямоугольник нулевого размера, главнее корня, пока задана.
	 * `null` — точки нет, и панель встаёт у корня.
	 *
	 * Пишет её плагин открытия — правая кнопка, долгое касание, клавиша
	 * контекстного меню, — разметка отдаёт якорю панели. Значение, а не живой
	 * объект (AGENTS.md, «Контракт границы core → ui»): каждая смена — новый
	 * объект, а та же точка ничего не меняет и события не шлёт. Закрытие
	 * точку не снимает: гаснущая панель стоит там, где её открыли.
	 */
	get point(): TMenuPoint | null {
		return this._point
	}

	set point(value: TMenuPoint | null) {
		if (samePoint(this._point, value)) return

		this._point = value === null ? null : { x: value.x, y: value.y }
		this.events.emit('change:point', this._point)
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
	 *
	 * У области контекстного меню набор пуст: она не кнопка, и
	 * `aria-haspopup` с `aria-expanded` объявили бы скринридеру кнопку меню
	 * там, где её нет. Так и у Radix и Ark: паттерна APG у контекстного меню
	 * нет, и связки у области они не ставят.
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

		this._syncTriggerAria()

		// Потребитель, красящий свой триггер по контексту, читает открытость с
		// корня — как у Popover
		this._dataset.add('open', value)
	}

	/**
	 * Свою сторону связки меню пишет у кнопки: она открывает меню, и меню
	 * открыто или нет. У области контекстного меню — ничего (см.
	 * `triggerAria`).
	 */
	protected _syncTriggerAria(): void {
		const button = this._openOn === 'press'

		this._triggerAria.add('aria-haspopup', button ? 'menu' : null)
		this._triggerAria.add('aria-expanded', button ? String(this._open) : null)
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
			openOn: this._openOn,
		}
	}
}
