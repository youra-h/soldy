import { TLayer } from '../../base/layer'
import type { TDefaultValues } from '../../base/component'
import type { IToasts, IToastsProps, TToastsEvents, TToastsLayout, TToastsPlacement } from './types'

/**
 * Toasts — менеджер всплывающих уведомлений и их регион.
 *
 * Тосты — элементы коллекции владельца, очередь — движок с расширением
 * `toasts` (`TToastsExtension`): вставка, предел видимых, длительность и
 * сторона жеста. Своего массива тостов у класса нет. Приходят тосты из кода
 * (`show` расширения), в разметку их не ставят.
 *
 * **Регион — слой** (`TLayer`): у него цель телепорта, номер в общем стеке и
 * `data-layer`. Без слоя плагины оверлея сочли бы его страницей: модальное
 * окно спрятало бы тосты от скринридера (`THideOutsidePlugin`), а нажатие в
 * тост закрыло бы поповер (`TDismissPlugin`). Регион виден всегда и
 * поднимается в стеке на каждый новый тост и на F8: «Сохранено» видно поверх
 * окна, открытого раньше.
 *
 * Регион стоит и пустым: живая область должна быть в документе до первого
 * тоста, иначе скринридер первый тост не объявит. Поэтому `role="region"` и
 * `aria-live="polite"` ядро пишет с конструктора; имя региона от локали
 * («Уведомления (F8)») пишет плагин имён.
 *
 * **Место** (`placement`) — модификатор `--placement-<v>`, стоит всегда:
 * раскладку региона у края окна держит тема. Из места же расширение выводит,
 * куда тост смахивают.
 *
 * **Раскладка** (`layout`) — модификатор `--layout-<v>`, тоже всегда: столбец
 * (`list`) или стопка (`cascade`). В стопке передний тост — первый по порядку
 * коллекции, а глубина тоста — его место в составе (`order` фасада тоста), и
 * экран со скринридером видят один порядок. Вывести задний тост вперёд —
 * перестановка в коллекции (`plain.move`), а не состояние тоста: колесо и
 * стрелки листают стопку плагином стопки, раскладывает её тема.
 *
 * **Длительность** (`duration`) — для тостов без своей: `0` — тост держится,
 * пока его не закроют. Отсчёт ведёт плагин таймера, а не ядро: время — дело
 * узла и вкладки браузера.
 */
export default class TToasts extends TLayer<IToastsProps, TToastsEvents> implements IToasts {
	static override baseClass = 'so-toasts'

	static defaultValues: typeof TLayer.defaultValues &
		TDefaultValues<IToastsProps, 'placement' | 'layout' | 'max' | 'duration'> = {
		...TLayer.defaultValues,
		// Регион виден всегда: открыт или закрыт — у самого тоста
		visible: true,
		tag: 'section',
		placement: 'bottom-end',
		layout: 'list',
		max: 3,
		duration: 5000,
	}

	protected _placement!: TToastsPlacement
	protected _layout!: TToastsLayout
	protected _max: number
	protected _duration: number

	constructor(props: Partial<IToastsProps> = {}) {
		super(props)

		const ctor = new.target as typeof TToasts

		this._max = props.max ?? ctor.defaultValues.max
		this._duration = props.duration ?? ctor.defaultValues.duration

		this._applyPlacement(props.placement ?? ctor.defaultValues.placement)
		this._applyLayout(props.layout ?? ctor.defaultValues.layout)

		// Живая область — в документе до первого тоста
		this._aria.add('role', 'region')
		this._aria.add('aria-live', 'polite')
	}

	/** Где регион тостов. */
	get placement(): TToastsPlacement {
		return this._placement
	}

	set placement(value: TToastsPlacement) {
		if (this._placement === value) return

		this._applyPlacement(value, this._placement)
		this.events.emit('change:placement', value)
	}

	/** Как тосты стоят в регионе: столбцом (`list`) или стопкой (`cascade`). */
	get layout(): TToastsLayout {
		return this._layout
	}

	set layout(value: TToastsLayout) {
		if (this._layout === value) return

		this._applyLayout(value, this._layout)
		this.events.emit('change:layout', value)
	}

	/** Сколько тостов видно разом; остальные ждут, пока место освободится. */
	get max(): number {
		return this._max
	}

	set max(value: number) {
		if (this._max === value) return

		this._max = value
		this.events.emit('change:max', value)
	}

	/** Длительность тоста без своей, мс; `0` — держится, пока не закроют. */
	get duration(): number {
		return this._duration
	}

	set duration(value: number) {
		if (this._duration === value) return

		this._duration = value
		this.events.emit('change:duration', value)
	}

	protected _applyPlacement(newValue: TToastsPlacement, oldValue?: TToastsPlacement): void {
		this._classes.swap({
			prefix: '--placement-',
			oldValue,
			newValue,
		})

		this._placement = newValue
	}

	protected _applyLayout(newValue: TToastsLayout, oldValue?: TToastsLayout): void {
		this._classes.swap({
			prefix: '--layout-',
			oldValue,
			newValue,
		})

		this._layout = newValue
	}

	override getProps(): IToastsProps {
		return {
			...super.getProps(),
			placement: this._placement,
			layout: this._layout,
			max: this._max,
			duration: this._duration,
		}
	}
}
