/**
 * Регистрация элементов с защитой от повторной (HMR, тесты) и признаком
 * «ожил при регистрации»: такую разметку база откладывает в очередь
 * регистрации, а собирает её регистрация, когда оживлять больше некого — в
 * браузере сразу после синхронной части, с полифилом в Safari после его
 * микрозадач оживления. AGENTS.md (Web Components), «Регистрация и полифил».
 */

import { TPlaceContext } from '../context'
import { TDeferral } from './deferral'

type TBuiltIn = {
	readonly ctor: CustomElementConstructor
	readonly tag: string
}

/** Идёт `customElements.define`: браузер оживляет разметку внутри него. */
let defining = false

/** Фаза, чей снимок впереди: встроенные имена фазы. */
let phase: Map<string, TBuiltIn> | undefined

/** Элементы, которых снимок ждёт от полифила. */
const expected = new Set<Node>()

/** Сколько снимков ждут конца своей фазы. */
let ending = 0

export function isUpgradedOnRegistration(element: Element): boolean {
	return defining || expected.has(element)
}

/** Ждёт ли снимок оживления элемента выше по месту: теневые корни снимок не видит. */
export function isUnderUpgrade(node: Node): boolean {
	if (expected.size === 0) return false

	for (const place of TPlaceContext.ancestors(node)) {
		if (expected.has(place)) return true
	}

	return false
}

/** Встроенные элементы с именами фазы, ещё не ставшие экземплярами своего класса. */
function awaited(names: ReadonlyMap<string, TBuiltIn>): Element[] {
	if (names.size === 0) return []

	const selector = [...names].map(([name, { tag }]) => `${tag}[is="${name}"]`).join(',')

	return [...document.querySelectorAll(selector)].filter((element) => {
		const builtIn = names.get(element.getAttribute('is') ?? '')

		return builtIn !== undefined && !(element instanceof builtIn.ctor)
	})
}

function settle(): void {
	if (phase !== undefined || ending > 0) return

	TDeferral.registration.release()
}

/** Снимок фазы — один обход документа на все её регистрации. */
function snapshot(names: ReadonlyMap<string, TBuiltIn>): void {
	phase = undefined

	const waiting = awaited(names)

	if (waiting.length === 0) {
		settle()

		return
	}

	for (const element of waiting) expected.add(element)

	ending += 1

	// Конец фазы — после микрозадач оживления полифила: не пришедших сняли
	queueMicrotask(() => {
		for (const element of waiting) expected.delete(element)

		ending -= 1
		settle()
	})
}

function enter(name: string, ctor: CustomElementConstructor, tag: string | undefined): void {
	let names = phase

	if (names === undefined) {
		const opened = new Map<string, TBuiltIn>()

		phase = opened
		names = opened
		queueMicrotask(() => snapshot(opened))
	}

	if (tag !== undefined) names.set(name, { ctor, tag })
}

function register(
	name: string,
	ctor: CustomElementConstructor,
	options?: ElementDefinitionOptions,
): void {
	if (typeof customElements === 'undefined') return
	if (customElements.get(name)) return

	// Фаза — до `define`: снимок встаёт раньше оживления полифила
	enter(name, ctor, options?.extends)

	// Прежнее значение: регистрация из колбэка не снимет признак внешней
	const outer = defining

	defining = true

	try {
		customElements.define(name, ctor, options)
	} finally {
		defining = outer
	}
}

/** Элемент, расширяющий встроенный элемент тега: `<button is="so-button">`. */
export function defineElement(name: string, ctor: CustomElementConstructor, tag: string): void {
	register(name, ctor, { extends: tag })
}

/**
 * Автономный элемент без коробки — тот, у которого в остальных адаптерах узла
 * нет: `<so-locale-provider>`, `<so-virtual>`, `<so-toasts>`.
 */
export function defineAutonomousElement(name: string, ctor: CustomElementConstructor): void {
	register(name, ctor)
}
