/**
 * Раскладка того, что ядро пишет на корень-хост: наборы `aria`, `attrs`,
 * `dataset` (`applyAttributes`), классы (`applyClasses`) и скрытие
 * (`applyHidden`).
 *
 * Корень компонента — сам хост (`<so-button>`, см. `TSoldyElement`), и
 * атрибуты на нём ставит не только база: `class`, `style`, `title`, `id`,
 * `data-*`, `tabindex`, `role` — всё, что потребитель написал в разметке или
 * поставил из кода. Атрибуты потребителя главнее наборов ядра, как во Vue и
 * React (`docs/agents/a11y.md`, «Атрибуты снаружи — поверх наборов»):
 * `tabindex="-1"` переживает смену `disabled`, `role="link"` — роль кнопки,
 * которую пишет ядро.
 *
 * Правило то же, что у корня-хоста Angular, копия своя: адаптеры друг друга не
 * импортируют. Чей атрибут, база узнаёт по значению: по каждому имени она
 * помнит значение, которое поставила сама. Атрибута нет или стоит её значение
 * — она пишет своё и снимает своё. Стоит другое — это атрибут потребителя:
 * база его не трогает и своим больше не считает. Наблюдатель за хостом для
 * этого не нужен: атрибут разметки стоит на хосте раньше первой раскладки, а
 * записанный позже следующая раскладка видит по значению. Класс — по тому же
 * правилу, отдельными токенами: свой база ставит и снимает, а класс, который
 * уже стоял, когда ядро его назвало, — потребителя.
 *
 * Неразличим один случай: потребитель поставил ровно то, что у ядра, — то же
 * значение атрибута или тот же класс уже после базы. Тогда он выглядит своим,
 * и, сняв своё, база снимет и его.
 *
 * Память — своя у каждого набора и у классов: `aria`, `attrs` и `dataset` по
 * именам не пересекаются, и раздельная память не даёт одному набору снять
 * атрибут, поставленный другим. Держит её элемент, а не связка: связка у
 * элемента новая на каждое подключение, и со свежей памятью своё значение
 * после перестановки база сочла бы чужим.
 */

import type { TAttributesMap } from '@soldy-ui/core'

/** Что поставила база в прошлый раз: имя → значение. */
export type TAppliedAttributes = ReadonlyMap<string, string>

/** Какие классы поставила база в прошлый раз. */
export type TAppliedClasses = ReadonlySet<string>

/**
 * Инлайновый `display`, который стоял на корне до того, как база его скрыла;
 * `undefined` — корень базой не скрыт.
 */
export type THiddenDisplay = string | undefined

/**
 * Раскладывает набор на элемент и возвращает новую память базы. `null` в
 * наборе ядра — «атрибута нет».
 */
export function applyAttributes(
	element: Element,
	set: TAttributesMap,
	applied: TAppliedAttributes,
): TAppliedAttributes {
	const next = new Map<string, string>()

	for (const [name, value] of Object.entries(set)) {
		if (value === null) continue

		const current = element.getAttribute(name)

		// Чужое значение — атрибут потребителя
		if (current !== null && current !== applied.get(name)) continue

		if (current !== value) element.setAttribute(name, value)

		next.set(name, value)
	}

	// Ушло из набора — снимается, если на элементе ещё своё значение: у
	// выключенной кнопки из набора пропадает `tabindex`
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
