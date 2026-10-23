/**
 * defineElement — регистрация элемента soldy с защитой от повторной.
 *
 * Элемент soldy расширяет встроенный элемент своего тега (customized built-in,
 * см. `ElementBase`): имя регистрируется с `extends`, и в разметке элемент
 * пишется нативным тегом с атрибутом `is` — `<button is="so-button">`.
 *
 * Импорт пакета регистрирует элементы: `<button is="so-button">` должен
 * работать сразу, это ожидаемое поведение библиотеки Web Components. Guard
 * нужен, потому что повторный customElements.define бросает исключение — а
 * такое случается при HMR и в тестах, где модуль подгружается несколько раз.
 *
 * Элементы, которые уже стоят в документе, регистрация оживляет ещё при
 * импорте пакета — раньше строк точки входа, где приложение подключает тему,
 * иконки и свои плагины. Их первую сборку база откладывает в очередь
 * регистрации (`TDeferral.registration`, `deferral.ts`), а собирает очередь
 * сама регистрация — когда оживлять больше некого. Ожил ли при регистрации
 * данный элемент, отвечает `isUpgradedOnRegistration`:
 *
 * - браузер оживляет разметку внутри `customElements.define`, синхронно: на
 *   время вызова регистрация держит признак (`defining`);
 * - полифил в Safari — позже, своей микрозадачей на каждый `define`. Поэтому
 *   регистрация ведёт фазу. Первая регистрация фазы ещё до
 *   `customElements.define` ставит микрозадачу снимка: он приходит после всех
 *   регистраций фазы — синхронной части — и раньше оживления полифила и
 *   запоминает встроенные элементы с именами фазы (`button[is="so-button"]`,
 *   как ищет их полифил), которые ещё не стали экземплярами класса,
 *   переданного регистрацией. Снимок ставит микрозадачу конца фазы: она
 *   приходит после оживления полифила и забывает тех, кто так и не пришёл, —
 *   их сняли до оживления. Теневые корни снимок не видит, и разметка в них
 *   под элементом, которого он ждёт, встаёт в очередь регистрации
 *   (`isUnderUpgrade`).
 *
 * Снимок — один на фазу, а не на каждый `define`: один обход документа на
 * загрузку вместо полусотни. В браузере он пуст, и очередь регистрации
 * собирается на нём — сразу после синхронной части. С полифилом — в конце
 * фазы, после всех его микрозадач оживления, и момент и порядок для разметки
 * страницы одни во всех браузерах. Собирать очередь по первому, кто в неё
 * пришёл, рано: автономный элемент (`<so-toasts>` вокруг приложения) полифил
 * оставляет браузеру, и тот оживляет его внутри `define`, а встроенные
 * элементы с именами, зарегистрированными позже, полифил ещё не оживил. Сам
 * полифил по устройству не узнаётся: правило одно, в браузере снимок просто
 * пуст.
 */

import { TPlaceContext } from '../context'
import { TDeferral } from './deferral'

/** Встроенный элемент фазы: класс, который передала регистрация, и тег, который он расширяет. */
type TBuiltIn = {
	readonly ctor: CustomElementConstructor
	readonly tag: string
}

/** Идёт ли регистрация — браузер оживляет разметку внутри неё (см. шапку). */
let defining = false

/** Фаза, чей снимок ещё впереди: встроенные имена фазы. Нет — фазы нет. */
let phase: Map<string, TBuiltIn> | undefined

/** Элементы, чьего оживления ждут снимки: их оживит полифил своей микрозадачей. */
const expected = new Set<Node>()

/** Сколько снимков ждут конца своей фазы. */
let ending = 0

/**
 * Ожил ли элемент при регистрации своего имени: браузер оживляет его внутри
 * `customElements.define`, а полифил — своей микрозадачей фазы, и тогда его
 * ждёт снимок (см. шапку).
 */
export function isUpgradedOnRegistration(element: Element): boolean {
	return defining || expected.has(element)
}

/**
 * Ждёт ли снимок оживления элемента выше `node` по месту — сам узел не в
 * счёт. Подключение под таким встаёт в очередь регистрации и собирается после
 * него. Теневые корни снимок не видит, а полифил оживляет их разметку той же
 * микрозадачей, что и свет её имени: с именем, зарегистрированным раньше
 * имени владельца, она пришла бы раньше, чем владелец встал в очередь.
 */
export function isUnderUpgrade(node: Node): boolean {
	if (expected.size === 0) return false

	for (
		let place = TPlaceContext.above(node);
		place !== null;
		place = TPlaceContext.above(place)
	) {
		if (expected.has(place)) return true
	}

	return false
}

/**
 * Встроенные элементы документа с именами фазы — их теги с атрибутом `is`, как
 * ищет полифил, — которые ещё не экземпляры своего класса: их оживит полифил.
 */
function awaited(names: ReadonlyMap<string, TBuiltIn>): Element[] {
	if (names.size === 0) return []

	const selector = [...names].map(([name, { tag }]) => `${tag}[is="${name}"]`).join(',')

	return [...document.querySelectorAll(selector)].filter((element) => {
		const builtIn = names.get(element.getAttribute('is') ?? '')

		return builtIn !== undefined && !(element instanceof builtIn.ctor)
	})
}

/**
 * Регистрация утихла — ни фазы, чей снимок впереди, ни оживления, которого
 * ждут снимки: очередь регистрации собирается.
 */
function settle(): void {
	if (phase !== undefined || ending > 0) return

	TDeferral.registration.release()
}

/**
 * Снимок фазы (см. шапку): ждать некого — регистрация утихла; иначе конец
 * фазы — следующей микрозадачей, после оживления полифила.
 */
function snapshot(names: ReadonlyMap<string, TBuiltIn>): void {
	phase = undefined

	const waiting = awaited(names)

	if (waiting.length === 0) {
		settle()

		return
	}

	for (const element of waiting) expected.add(element)

	ending += 1

	queueMicrotask(() => {
		for (const element of waiting) expected.delete(element)

		ending -= 1
		settle()
	})
}

/**
 * Регистрация входит в фазу: первая ставит снимок, встроенное имя — с тегом,
 * который расширяет, — его ждёт.
 */
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

/** Регистрация с защитой от повторной — одна на оба вида элементов адаптера. */
function register(
	name: string,
	ctor: CustomElementConstructor,
	options?: ElementDefinitionOptions,
): void {
	if (typeof customElements === 'undefined') return
	if (customElements.get(name)) return

	// Фаза — до `customElements.define`: снимок встаёт раньше оживления полифила
	enter(name, ctor, options?.extends)

	// Прежнее значение, а не `false`: регистрация, вложенная в колбэк элемента,
	// не снимет признак, пока внешняя ещё оживляет свои элементы
	const outer = defining

	defining = true

	try {
		customElements.define(name, ctor, options)
	} finally {
		defining = outer
	}
}

export function defineElement(name: string, ctor: CustomElementConstructor, tag: string): void {
	register(name, ctor, { extends: tag })
}

/**
 * Автономный элемент адаптера — элемент без своего узла в разметке остальных
 * адаптеров: провайдер локали `<so-locale-provider>` — механизм, у фреймворков
 * это контекст, — и окно `<so-virtual>` — компонент, у которого во Vue и React
 * узла нет. Нативного поведения, которое стоило бы сохранить, у них нет,
 * расширять нечего, и коробки нет (`displayContents`): пишутся они своим
 * тегом, без `is`.
 *
 * В бочку адаптера не входит: компонент со своим узлом так не регистрируют —
 * он расширяет нативный элемент своего тега (`defineElement`). Модули этих
 * двух элементов берут её отсюда.
 */
export function defineAutonomousElement(name: string, ctor: CustomElementConstructor): void {
	register(name, ctor)
}
