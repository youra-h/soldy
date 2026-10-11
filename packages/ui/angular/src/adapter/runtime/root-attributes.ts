/**
 * Раскладка того, что ядро пишет на корень-хост: наборы `aria`, `attrs`,
 * `dataset` (`applyAttributes`), классы (`applyClasses`) и стиль
 * (`applyStyles`).
 *
 * Корень компонента в Angular — элемент, который написал потребитель
 * (`<button so-button>`, см. `TComponentBase`), и атрибуты на нём ставит не
 * только база: статические атрибуты разметки потребителя, его `[attr.x]`,
 * `class`, `[class.x]`, `[ngClass]`. Атрибуты потребителя главнее наборов
 * ядра, как во Vue и React (`docs/agents/a11y.md`, «Атрибуты снаружи — поверх
 * наборов»): `tabindex="-1"` на `<div so-button>` переживает смену
 * `disabled`, `role="link"` на `<a so-button>` — роль кнопки, которую пишет
 * ядро.
 *
 * Чей атрибут, база узнаёт по значению: по каждому имени она помнит значение,
 * которое поставила сама. Атрибута нет или стоит её значение — она пишет своё
 * и снимает своё. Стоит другое — это атрибут потребителя: база его не трогает
 * и своим больше не считает. Наблюдатель за элементом для этого не нужен:
 * статический атрибут стоит на элементе ещё до конструктора компонента, а
 * `[attr.x]` Angular пишет поверх, и следующая раскладка видит его значение.
 * Класс — по тому же правилу, по имени: свой база ставит и снимает, а класс,
 * который уже стоял, когда ядро его назвало, — потребителя.
 *
 * Стиль — по тому же правилу, по каждому свойству отдельно, а не атрибутом
 * `style` целиком: в инлайновый стиль корня пишут и потребитель (`style`,
 * `[style.x]`, `[style]` — их ставит и снимает Angular), и плагины мимо
 * разметки (`--s-swipe-offset` смахиваемой панели), и привязка скрытия базы
 * (`[style.display]`). Свойство с чужим значением база не трогает, своё пишет
 * и снимает (`style.setProperty` / `removeProperty`), поэтому `[style.width]`
 * потребителя главнее размера от плагина раскладки, а свойство, записанное в
 * узел мимо раскладки, переживает её смену.
 *
 * Неразличим один случай: потребитель поставил ровно то, что у ядра, — то же
 * значение атрибута или свойства стиля, тот же класс уже после базы. Тогда он
 * выглядит своим, и, сняв своё, база снимет и его. И ещё одно следствие
 * правила: сняв своё значение, потребитель возвращает место базе только со
 * следующей её раскладкой — сама она узел не перечитывает.
 *
 * Память — своя у каждого набора, у классов и у стиля: `aria`, `attrs` и
 * `dataset` по именам не пересекаются, и раздельная память не даёт одному
 * набору снять атрибут, поставленный другим.
 */

/** Что поставила база в прошлый раз: имя → значение. */
export type TAppliedAttributes = ReadonlyMap<string, string>

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

/** Пустой набор — один на всех: тот же объект не будит эффект набора зря. */
const NO_ATTRIBUTES: object = Object.freeze({})

/** Нет классов — тот же пустой список, по той же причине. */
const NO_CLASSES: readonly string[] = Object.freeze([])

/**
 * Набор из состояния компонента — объект `имя → значение`, а чего нет —
 * пустой набор. База не знает инстанса компонента и читает его состояние по
 * именам, поэтому вид значения проверяет здесь, а не берёт на веру.
 */
export function attributesOf(value: unknown): object {
	return typeof value === 'object' && value !== null ? value : NO_ATTRIBUTES
}

/**
 * Классы из состояния компонента — снимок `TClasses`, список имён. Тот же
 * массив, что в состоянии: пока классы не сменились, эффекту нечего делать.
 */
export function classesOf(value: unknown): readonly string[] {
	return Array.isArray(value) && value.every((name): name is string => typeof name === 'string')
		? value
		: NO_CLASSES
}

/**
 * Стиль корня из слоёв состояния — снизу вверх: выход плагина раскладки
 * (`layout_styles`), поверх него стиль-выход самого компонента
 * (`fractionStyle` у ProgressSpinner). Из одноимённых свойств действует
 * верхний слой.
 *
 * Слой — объект `имя → значение` с именами, как в CSS: так их пишут плагины и
 * ядро. Число уходит строкой как есть (`z-index: 3`). Пустая строка и всё, что
 * не строка и не число, свойства не задают: у иконки без размера плагин
 * отдаёт `width: ''`. Слоя нет — он пуст: плагин раскладки есть не у всех,
 * стиль-выход — тоже. Вид значения проверяется здесь по той же причине, что у
 * наборов: база читает состояние по именам.
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
 * Раскладывает набор на элемент и возвращает новую память базы. Строка —
 * значение атрибута, всё остальное (`null` у наборов ядра) — «атрибута нет».
 */
export function applyAttributes(
	element: Element,
	set: object,
	applied: TAppliedAttributes,
): TAppliedAttributes {
	const next = new Map<string, string>()

	for (const [name, value] of Object.entries(set)) {
		if (typeof value !== 'string') continue

		const current = element.getAttribute(name)

		// Чужое значение — атрибут потребителя
		if (current !== null && current !== applied.get(name)) continue

		if (current !== value) element.setAttribute(name, value)

		next.set(name, value)
	}

	// Ушло из набора — снимается, если на элементе ещё своё значение: у
	// выключенной кнопки на `div` из набора пропадает `tabindex`
	for (const [name, value] of applied) {
		if (!next.has(name) && element.getAttribute(name) === value) element.removeAttribute(name)
	}

	return next
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
	element: Element,
	styles: TRootStyles,
	applied: TAppliedStyles,
): TAppliedStyles {
	if (!hasInlineStyle(element)) return applied

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

/** Узел со своим инлайновым стилем — HTML и SVG. */
function hasInlineStyle(element: Element): element is Element & ElementCSSInlineStyle {
	return 'style' in element
}
