/**
 * Раскладка того, что ядро пишет на корень-хост: наборы `aria`, `attrs`,
 * `dataset` (`applyAttributes`), классы (`applyClasses`), стиль
 * (`applyStyles`) и скрытие (`applyHidden`).
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
 * Память — своя у каждого набора, у классов и у стиля: `aria`, `attrs` и
 * `dataset` по именам не пересекаются, и раздельная память не даёт одному
 * набору снять атрибут, поставленный другим. Держит её элемент, а не связка:
 * связка у элемента новая на каждое подключение, и со свежей памятью своё
 * значение после перестановки база сочла бы чужим.
 */

import type { TAttributesMap } from '@soldy-ui/core'

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
 * Раскладывает набор на элемент и возвращает новую память базы. `null` в
 * наборе ядра — «атрибута нет». `inputs` — атрибуты-входы пропов: их база
 * ведёт по набору всегда (см. шапку).
 */
export function applyAttributes(
	element: Element,
	set: TAttributesMap,
	applied: TAppliedAttributes,
	inputs: ReadonlySet<string> = new Set(),
): TAppliedAttributes {
	const next = new Map<string, string>()

	for (const [name, value] of Object.entries(set)) {
		if (value === null) continue

		const current = element.getAttribute(name)

		// Чужое значение — атрибут потребителя
		if (current !== null && current !== applied.get(name) && !inputs.has(name)) continue

		if (current !== value) element.setAttribute(name, value)

		next.set(name, value)
	}

	// Ушло из набора — снимается, если на элементе ещё своё значение: у
	// выключенной кнопки из набора пропадает `disabled`. Вход пропа снимается
	// при любом значении: ядро его уже приняло
	for (const [name, value] of applied) {
		if (next.has(name)) continue

		if (inputs.has(name) || element.getAttribute(name) === value) element.removeAttribute(name)
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
