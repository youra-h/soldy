/**
 * Описание корня — что у компонентов база раскладывает по-разному. Нет его —
 * корень как у всех: сам элемент, стиль только от плагина раскладки,
 * видимость прячет корень. AGENTS.md (Web Components), «Корень».
 *
 * - `'host'` — корень — сам элемент потребителя (`<button is="so-button">`);
 * - `'wrapped'` — элемент — обёртка, корень — узел шаблона в ней: окно
 *   таблицы вокруг `table`, где корень и поле; с `teleport` корень уезжает в
 *   слой, а обёртка без коробки остаётся местом (регион тостов).
 */

import type { TStateSnapshot } from '@soldy-ui/setup'
import type { TTeleportPlace } from './teleport'

export type TRootSet = 'attrs' | 'aria' | 'dataset'

/** Имена выходов состояния: селектор цели и «на месте». Без `contained` корень всегда в цели. */
export type TRootTeleport = {
	readonly target: string
	readonly contained?: string
}

export type TRootSpec =
	| {
			readonly strategy: 'host'
			/** Выход со стилем, который считает ядро (`fractionStyle` у ProgressSpinner). */
			readonly style?: string
			/** Прячут ли `visible` и `rendered` корень; нет у Skeleton. По умолчанию да. */
			readonly hides?: boolean
			/** Корень встаёт по месту в коллекции: `order` фасада — в стиль (Tabs, Accordion). */
			readonly order?: boolean
			/** Выход, без которого корня нет, как `v-if` (`active` панели таба). */
			readonly shownBy?: string
			readonly teleport?: TRootTeleport
			/** Наборы ядра на корне; у поля `aria` стоит на `<input>`. По умолчанию все три. */
			readonly sets?: readonly TRootSet[]
			/** Выход слоя `aria` корня (`rootAria` у Slider). По умолчанию `aria`. */
			readonly aria?: string
			/** Статика разметки элемента, кроме класса и стиля, — узлу `control` шаблона. */
			readonly control?: boolean
			/** `id` — проп поля, хотя статика остаётся корню (Rating). */
			readonly fieldId?: boolean
	  }
	| { readonly strategy: 'wrapped'; readonly teleport?: TRootTeleport }

/** Что база берёт из описания корня — один раз, на класс элемента. */
export type TRootPlan = {
	readonly wrapped: boolean
	/** Статика разметки уходит полю, и набор владельца ждёт его построения. */
	readonly control: boolean
	readonly fieldId: boolean
	/** Что из статики остаётся на элементе при переносе, сверх входов и своих атрибутов. */
	readonly keep: ReadonlySet<string>
	/** Внешний узел — корень: обёртка в слое только место. */
	readonly outerIsRoot: boolean
	readonly layer?: TRootTeleport
	readonly style?: string
	readonly order: boolean
	readonly shownBy?: string
	readonly hides: boolean
	/** Снимает ли `rendered=false` поддерево: у Skeleton и обёртки в слое нет. */
	readonly unrenders: boolean
	/** Слой раскладчика и выход состояния, из которого он берётся. */
	readonly sets: readonly (readonly [TRootSet, string])[]
}

const ROOT_SETS: readonly TRootSet[] = ['attrs', 'aria', 'dataset']

/** Класс и стиль — корню; `is` — имя элемента, `slot` — его место в свете родителя. */
const ROOT_ONLY: ReadonlySet<string> = new Set(['class', 'style', 'is', 'slot'])

/** Обёртка в слое — только место: класс и стиль уходят корню. */
const PLACE_ONLY: ReadonlySet<string> = new Set(['is', 'slot'])

const HOST: TRootSpec = { strategy: 'host' }

export function planOf(spec: TRootSpec = HOST): TRootPlan {
	if (spec.strategy === 'wrapped') {
		const layered = spec.teleport !== undefined

		return {
			wrapped: true,
			control: !layered,
			fieldId: false,
			keep: layered ? PLACE_ONLY : ROOT_ONLY,
			outerIsRoot: layered,
			layer: spec.teleport,
			order: false,
			hides: true,
			unrenders: !layered,
			sets: setsOf(ROOT_SETS, 'aria'),
		}
	}

	const hides = spec.hides ?? true

	return {
		wrapped: false,
		control: spec.control === true,
		fieldId: spec.fieldId === true,
		keep: ROOT_ONLY,
		outerIsRoot: false,
		layer: spec.teleport,
		style: spec.style,
		order: spec.order === true,
		shownBy: spec.shownBy,
		hides,
		unrenders: hides,
		sets: setsOf(spec.sets ?? ROOT_SETS, spec.aria ?? 'aria'),
	}
}

function setsOf(sets: readonly TRootSet[], aria: string): readonly (readonly [TRootSet, string])[] {
	return sets.map((set) => [set, set === 'aria' ? aria : set])
}

/** Куда корню слоя: селектор цели — непустая строка, остальное — цели нет. */
export function placeOf(state: TStateSnapshot, layer: TRootTeleport): TTeleportPlace {
	const target = state[layer.target]

	return {
		target: typeof target === 'string' && target !== '' ? target : null,
		contained: layer.contained !== undefined && state[layer.contained] === true,
	}
}

/** Скрыт ли внешний узел, есть ли корень у плагинов и есть ли своё поддерево. */
export type TPresence = {
	readonly hidden: boolean
	readonly present: boolean
	readonly subtree: boolean
}

/**
 * Корня нет там, где его снял бы `v-if` у Vue: без поддерева у предка, при
 * `rendered=false` и без выхода `shownBy`. `visible` — это `v-show`, а слой без
 * цели только спрятан: узел у плагинов у обоих остаётся. Слой прячется и без
 * поддерева у предка — `display: none` предка до увезённого корня не доходит.
 */
export function presenceOf(
	plan: TRootPlan,
	state: TStateSnapshot,
	above: boolean,
	placed: boolean,
): TPresence {
	const unrendered = state['rendered'] === false
	const unseen = plan.hides && (unrendered || state['visible'] === false)
	const absent = plan.shownBy !== undefined && state[plan.shownBy] !== true

	return {
		hidden: unseen || absent || !placed || (plan.layer !== undefined && !above),
		present: above && !(plan.hides && unrendered) && !absent,
		subtree: above && !(plan.unrenders && unrendered) && !absent,
	}
}
