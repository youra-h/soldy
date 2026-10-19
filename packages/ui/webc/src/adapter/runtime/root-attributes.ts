/**
 * Раскладка того, что ядро пишет на корень-хост: наборы `aria`, `attrs`,
 * `dataset` (`applyAttributes` — раскладчиком элемента `TElementAttributes`),
 * классы (`applyClasses`), стиль (`applyStyles`) и скрытие (`applyHidden`).
 *
 * Корень компонента — сам элемент (`<button is="so-button">`, см.
 * `SoldyElement`), и атрибуты на нём ставит не только база: `class`, `style`,
 * `title`, `id`, `data-*`, `tabindex`, `aria-*` — всё, что потребитель написал
 * в разметке или поставил из кода. Атрибуты потребителя главнее наборов ядра,
 * как во Vue и React (`docs/agents/a11y.md`, «Атрибуты снаружи — поверх
 * наборов»): `aria-label` потребителя переживает перерисовку.
 *
 * Исключение — атрибуты-входы пропов (`inputs`): атрибут, через который
 * потребитель задаёт проп (`disabled`), и значение ядра для него — одно
 * состояние. Ядро его уже приняло, поэтому значение из набора верно всегда, и
 * база ведёт такой атрибут сама, чей бы он ни был: иначе `<button is="so-button"
 * disabled>` после `ctrl.disabled = false` осталась бы выключенной.
 *
 * Чей атрибут, база узнаёт по значению: по каждому имени она помнит значение,
 * которое поставила сама. Атрибута нет или стоит её значение — она пишет своё и
 * снимает своё. Стоит другое — это атрибут потребителя: база его не трогает и
 * своим больше не считает. Наблюдатель за хостом для этого не нужен: атрибут
 * разметки стоит на хосте раньше первой раскладки, а записанный позже следующая
 * раскладка видит по значению. Класс — по тому же правилу, отдельными токенами:
 * свой база ставит и снимает, а класс, который уже стоял, когда ядро его
 * назвало, — потребителя.
 *
 * Атрибуты на элемент пишут не только наборы его собственного ядра: на
 * элемент шаблона кладёт свой набор разметка владельца — `aria` поля на
 * `<input>`, `clearAria` поля на кнопку очистки. Когда такой элемент — корень
 * вложенного компонента (кнопка), писателей двое, и пишут они через один
 * раскладчик элемента (`TElementAttributes`): каждый свой слой, на элемент —
 * их сумма, набор владельца поверх наборов самого элемента.
 *
 * Стиль — по тому же правилу, по каждому свойству отдельно, а не атрибутом
 * `style` целиком: в инлайновый стиль корня пишут и потребитель (`style` в
 * разметке, `el.style.x` из кода), и плагины мимо разметки
 * (`--so-swipe-offset` смахиваемой панели), и скрытие базы (`display`).
 * Свойство с чужим значением база не трогает, своё пишет и снимает
 * (`style.setProperty` / `removeProperty`), поэтому `style.width`
 * потребителя главнее размера от плагина раскладки, а свойство, записанное в
 * узел мимо раскладки, переживает её смену.
 *
 * Неразличим один случай: потребитель поставил ровно то, что у ядра, — то же
 * значение атрибута или свойства стиля, тот же класс уже после базы. Тогда он
 * выглядит своим, и, сняв своё, база снимет и его. И ещё одно следствие
 * правила: сняв своё значение, потребитель возвращает место базе только со
 * следующей её раскладкой — сама она узел не перечитывает.
 *
 * Память — своя у классов и у стиля, а у атрибутов одна на элемент — у его
 * раскладчика: одна память на все слои не даёт одному писателю снять атрибут,
 * поставленный другим. Держит её элемент, а не связка: связка у элемента
 * новая на каждое подключение, и со свежей памятью своё значение после
 * перестановки база сочла бы чужим.
 *
 * Корень — не всегда сам элемент: у таблицы это узел шаблона внутри элемента,
 * `table` в окне (`TRootSpec.wrapped`). Наборы, классы и стиль ядра база
 * кладёт на него тем же правилом, класс и стиль потребителя и скрытие
 * остаются на элементе — внешнем узле компонента, — а остальные атрибуты его
 * разметки база при построении переносит на `table`, как на поле, и там они
 * так же главнее наборов ядра.
 */

/**
 * Атрибут, который поставил раскладчик: значение и вход ли это пропа — его
 * раскладчик ведёт по набору, чей бы он ни был (см. шапку).
 */
type TAppliedAttribute = {
	readonly value: string
	readonly input: boolean
}

/** Что поставил раскладчик в прошлый раз: имя → атрибут. */
export type TAppliedAttributes = ReadonlyMap<string, TAppliedAttribute>

/** Какие классы поставила база в прошлый раз. */
export type TAppliedClasses = ReadonlySet<string>

/** Стиль корня: имя свойства, как в CSS (`z-index`, `--*`), → значение. */
export type TRootStyles = ReadonlyMap<string, string>

/**
 * Свойство стиля, которое поставила база: значение, которое она записала, и
 * каким его вернул узел. Узел значение нормализует (цвета, единицы), поэтому
 * чужое ли свойство, база судит по прочитанному, а нужна ли запись — по
 * своему.
 */
type TAppliedStyle = {
	readonly value: string
	readonly written: string
}

/** Что из стиля поставила база в прошлый раз: имя → свойство. */
export type TAppliedStyles = ReadonlyMap<string, TAppliedStyle>

/**
 * Инлайновый `display`, который стоял на корне до того, как база его скрыла;
 * `undefined` — корень базой не скрыт.
 */
export type THiddenDisplay = string | undefined

/**
 * Стиль корня из слоёв состояния — снизу вверх: выход плагина раскладки
 * (`layout_styles`), поверх него стиль-выход самого компонента
 * (`fractionStyle` у ProgressSpinner). Из одноимённых свойств действует
 * верхний слой.
 *
 * Слой — объект `имя → значение` с именами, как в CSS: так их пишут плагины и
 * ядро, и на узел они уходят как есть. Число уходит строкой (`z-index: 3`).
 * Пустая строка и всё, что не строка и не число, свойства не задают: у иконки
 * без размера плагин отдаёт `width: ''`. Слоя нет — он пуст: плагин раскладки
 * есть не у всех, стиль-выход — тоже. База не знает инстанса компонента и
 * читает его состояние по именам, поэтому вид значения проверяет здесь, а не
 * берёт на веру.
 */
export function stylesOf(...layers: readonly unknown[]): TRootStyles {
	const styles = new Map<string, string>()

	for (const layer of layers) {
		if (typeof layer !== 'object' || layer === null) continue

		for (const [name, value] of Object.entries(layer)) {
			if (typeof value === 'number') styles.set(name, String(value))
			else if (typeof value === 'string' && value !== '') styles.set(name, value)
		}
	}

	return styles
}

/**
 * Место элемента коллекции в её ряду — слой стиля корня (`TRootSpec.order`):
 * ряд коллекции — флексбокс, и элемент встаёт по номеру в коллекции, а не по
 * месту в разметке, как `:style="{ order }"` у Vue. Номера нет — слоя нет.
 */
export function orderOf(value: unknown): object | undefined {
	return typeof value === 'number' ? { order: value } : undefined
}

/**
 * Раскладывает атрибуты на элемент и возвращает новую память раскладчика.
 * `wanted` — что слои называют: имя → значение и вход ли это пропа (см.
 * шапку).
 */
export function applyAttributes(
	element: Element,
	wanted: TAppliedAttributes,
	applied: TAppliedAttributes,
): TAppliedAttributes {
	const next = new Map<string, TAppliedAttribute>()

	for (const [name, attribute] of wanted) {
		const current = element.getAttribute(name)

		// Чужое значение — атрибут потребителя
		if (current !== null && current !== applied.get(name)?.value && !attribute.input) continue

		if (current !== attribute.value) element.setAttribute(name, attribute.value)

		next.set(name, attribute)
	}

	// Ушло из набора — снимается, если на элементе ещё своё значение: у
	// выключенной кнопки из набора пропадает `disabled`. Вход пропа снимается
	// при любом значении: ядро его уже приняло
	for (const [name, { value, input }] of applied) {
		if (next.has(name)) continue

		if (input || element.getAttribute(name) === value) element.removeAttribute(name)
	}

	return next
}

/**
 * Слои атрибутов элемента — кто их пишет, снизу вверх:
 *
 * - `attrs`, `aria`, `dataset` — наборы ядра компонента, чей корень этот
 *   элемент (база, `SoldyElement`), в порядке шаблона Vue;
 * - `owner` — набор, который на элемент кладёт разметка компонента-владельца
 *   (`ownerAttributes`): `aria` поля — на `<input>`, `clearAria` поля — на
 *   вложенную кнопку очистки.
 */
export const ATTRIBUTE_LAYERS = ['attrs', 'aria', 'dataset', 'owner'] as const

/** Слой атрибутов элемента — см. `ATTRIBUTE_LAYERS`. */
export type TAttributeLayer = (typeof ATTRIBUTE_LAYERS)[number]

/**
 * Слой: набор и его атрибуты-входы пропов. Набор — объект `имя → значение`:
 * база читает его из состояния по имени и вид не берёт на веру (`setOf`), а
 * на элемент идут только строки — `null` и всё прочее имени не называют.
 */
type TLayer = {
	readonly set: object
	readonly inputs: ReadonlySet<string>
}

/** Входов у слоя нет — набор владельца. */
const NO_INPUTS: ReadonlySet<string> = new Set()

/** Пустой набор — один на всех: чего в состоянии нет, то ничего не называет. */
const NO_SET: object = Object.freeze({})

/** Нет классов — тот же пустой список, по той же причине. */
const NO_CLASSES: readonly string[] = Object.freeze([])

/**
 * Набор ядра из состояния компонента — объект `имя → значение`, а чего нет —
 * пустой набор. База не знает инстанса компонента и читает его состояние по
 * именам: у невизуального компонента (окно `Virtual`) наборов нет вовсе.
 * Поэтому вид значения проверяется здесь, а не берётся на веру, как у
 * стиля (`stylesOf`).
 */
export function setOf(value: unknown): object {
	return typeof value === 'object' && value !== null ? value : NO_SET
}

/**
 * Классы из состояния компонента — снимок `TClasses`, список имён; чего нет —
 * пустой список. Читаются по имени, как наборы (`setOf`).
 */
export function classesOf(value: unknown): readonly string[] {
	return Array.isArray(value) && value.every((name): name is string => typeof name === 'string')
		? value
		: NO_CLASSES
}

/** Раскладчики по элементам: один на элемент, кто бы на него ни писал. */
const LAID_OUT = new WeakMap<Element, TElementAttributes>()

/**
 * Атрибуты элемента от всех, кто их на него пишет, — слоями
 * (`ATTRIBUTE_LAYERS`), одной раскладкой и одной памятью.
 *
 * На элемент пишут двое, когда он корень вложенного компонента: база этого
 * компонента — его наборы ядра — и разметка владельца — свой набор поверх
 * (`clearAria` поля на кнопке очистки). Набор владельца главнее на общем
 * имени, как атрибут снаружи у Vue и React: `role="tab"` строки перекрыл бы
 * `role="button"`, который кнопка на `div` пишет себе сама. Порядок, в каком
 * они пишут, не задан — разметка владельца пишет на флаше своего элемента,
 * база вложенного — на своём, — поэтому каждый пишет только свой слой, а на
 * элемент раскладчик кладёт их сумму, верхний поверх нижних. Две раскладки со
 * своей памятью спорили бы за общее имя: общее имя досталось бы тому, кто
 * записал первым, а второй счёл бы его атрибутом потребителя.
 *
 * Правило раскладки — `applyAttributes`: значение, которое раскладчик не
 * ставил, — атрибут потребителя, кроме входов пропов. Входы называет только
 * сам элемент — его база, вместе со своими наборами: на имени, которое
 * перекрыл набор владельца, правило входа не действует. `null` в наборе имя не
 * называет и нижний слой не перекрывает. Память — у раскладчика, а он — у
 * элемента: связка у элемента новая на каждое подключение.
 */
export class TElementAttributes {
	/** Раскладчик элемента: тот же у всех, кто на него пишет. */
	static of(element: Element): TElementAttributes {
		let attributes = LAID_OUT.get(element)

		if (!attributes) {
			attributes = new TElementAttributes(element)
			LAID_OUT.set(element, attributes)
		}

		return attributes
	}

	private readonly _layers = new Map<TAttributeLayer, TLayer>()
	private _applied: TAppliedAttributes = new Map()

	private constructor(private readonly _element: Element) {}

	/**
	 * Слой `layer` теперь — `set`; на элементе — сумма слоёв. `inputs` — атрибуты-
	 * входы пропов элемента: их называет база вместе со своими наборами.
	 */
	set(layer: TAttributeLayer, set: object, inputs: ReadonlySet<string> = NO_INPUTS): void {
		this._layers.set(layer, { set, inputs })
		this._applied = applyAttributes(this._element, this._sum(), this._applied)
	}

	/**
	 * Слои снизу вверх: из одноимённых действует верхний. Имя называет только
	 * строка: `null` в наборе нижний слой не перекрывает.
	 */
	private _sum(): TAppliedAttributes {
		const sum = new Map<string, TAppliedAttribute>()

		for (const name of ATTRIBUTE_LAYERS) {
			const layer = this._layers.get(name)

			if (!layer) continue

			for (const [attribute, value] of Object.entries(layer.set)) {
				if (typeof value === 'string')
					sum.set(attribute, { value, input: layer.inputs.has(attribute) })
			}
		}

		return sum
	}
}

/** Раскладывает классы ядра на элемент и возвращает новую память базы. */
export function applyClasses(
	element: Element,
	classes: readonly string[],
	applied: TAppliedClasses,
): TAppliedClasses {
	const next = new Set<string>()

	for (const name of classes) {
		// Стоял до того, как ядро его назвало, — класс потребителя
		if (element.classList.contains(name) && !applied.has(name)) continue

		element.classList.add(name)
		next.add(name)
	}

	// Ушёл из списка — снимается: смена `size` меняет модификатор
	for (const name of applied) {
		if (!next.has(name)) element.classList.remove(name)
	}

	return next
}

/**
 * Раскладывает стиль на элемент и возвращает новую память базы.
 *
 * Свойства нет на узле или стоит то, что поставила база, — она пишет своё,
 * если оно сменилось или узел его потерял. Стоит другое — это свойство
 * потребителя или плагина: база его не трогает и своим больше не считает.
 * Ушло из стиля — снимается, если на узле ещё своё значение. Остальных
 * свойств узла база не касается вовсе.
 */
export function applyStyles(
	element: ElementCSSInlineStyle,
	styles: TRootStyles,
	applied: TAppliedStyles,
): TAppliedStyles {
	const { style } = element
	const next = new Map<string, TAppliedStyle>()

	for (const [name, value] of styles) {
		const own = applied.get(name)
		const current = style.getPropertyValue(name)

		if (current !== '') {
			// Чужое значение — свойство потребителя или плагина
			if (own === undefined || current !== own.written) continue

			// Своё уже стоит — переписывать нечего
			if (own.value === value) {
				next.set(name, own)
				continue
			}
		}

		style.setProperty(name, value)

		const written = style.getPropertyValue(name)

		// Значение, которое узел не принял, на нём не стоит — своим считать нечего
		if (written !== '') next.set(name, { value, written })
	}

	for (const [name, { written }] of applied) {
		if (!next.has(name) && style.getPropertyValue(name) === written) style.removeProperty(name)
	}

	return next
}

/**
 * Прячет корень или показывает его и возвращает новую память базы.
 *
 * Как `v-show`: скрытие — `display: none` поверх инлайнового `display`
 * потребителя, а прежнее значение база запоминает. Показ возвращает его, если
 * на корне ещё стоит её `none`; стоит другое — потребитель поменял `display`
 * сам, пока корень был скрыт, и база его не трогает. Элемент при этом остаётся
 * на месте вместе с содержимым: убрать хост, который написал потребитель,
 * компонент не может, поэтому `rendered=false` прячет, как `visible=false`.
 */
export function applyHidden(
	element: ElementCSSInlineStyle,
	hidden: boolean,
	saved: THiddenDisplay,
): THiddenDisplay {
	if (hidden) {
		// Уже скрыт базой — прежнее значение запомнено
		if (saved !== undefined) return saved

		const display = element.style.display

		element.style.display = 'none'

		return display
	}

	if (saved !== undefined && element.style.display === 'none') element.style.display = saved

	return undefined
}
