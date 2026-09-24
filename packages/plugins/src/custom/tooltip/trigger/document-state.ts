import type { ITooltipEntry, TTooltipDocumentState } from './types'

/**
 * Подсказки документа: какая открыта и можно ли показать следующую без
 * задержки.
 *
 * Подсказка на экране одна. Открывшаяся сразу закрывает прежнюю: у соседних
 * кнопок две плашки встали бы рядом или друг на друга, и какая к чему
 * относится, было бы не понять. Прежнюю при этом может ещё держать фокус с
 * клавиатуры — показывает всё равно новая: её вызвал последний жест.
 *
 * Задержка показа нужна, чтобы подсказки не вспыхивали у всего, над чем
 * курсор просто прошёл. Но пользователь, который уже читает подсказки —
 * ведёт курсор вдоль ряда кнопок, — ждать её у каждой соседней не должен.
 * Поэтому, пока другая подсказка открыта или закрылась меньше
 * `TOOLTIP_SKIP_DELAY_MS` назад, следующая показывается сразу.
 *
 * Оба факта — о документе, а не о подсказке: флагом на плагине их не
 * выразить, соседка о нём не знает. Поэтому состояние одно на документ, как
 * замок прокрутки (`overlay/scroll-lock/lock.ts`), и документ берётся у
 * корня, а не из `globalThis`: подсказка живёт и в `iframe`.
 *
 * Окно — константа, а не проп: оно про то, как человек ведёт курсор по
 * странице, а не про одну подсказку, и у двух соседок с разными окнами
 * правило стало бы несимметричным.
 */

/** Сколько после закрытия подсказки следующая показывается без задержки, мс. */
export const TOOLTIP_SKIP_DELAY_MS = 300

const STATES = new WeakMap<Document, TTooltipDocumentState>()

function stateOf(doc: Document): TTooltipDocumentState {
	const known = STATES.get(doc)

	if (known) return known

	const state: TTooltipDocumentState = { open: null, warm: null }

	STATES.set(doc, state)

	return state
}

/**
 * Подсказка открылась: прежняя закрывается, окно без задержки больше не
 * нужно — пока эта открыта, соседка и так покажется сразу.
 *
 * Прежняя закрывается после того, как открытой записана новая: закрываясь,
 * она сообщит об этом (`tooltipClosed`), и запись новой не должна пропасть.
 */
export function tooltipOpened(doc: Document, entry: ITooltipEntry): void {
	const state = stateOf(doc)
	const previous = state.open

	state.open = entry
	stopWarm(state)

	if (previous && previous !== entry) previous.close()
}

/**
 * Подсказка закрылась: окно без задержки открывается для следующей. Закрытие
 * подсказки, которую уже сменила другая, ничего не меняет.
 */
export function tooltipClosed(doc: Document, entry: ITooltipEntry): void {
	const state = STATES.get(doc)

	if (!state || state.open !== entry) return

	state.open = null
	stopWarm(state)
	state.warm = setTimeout(() => {
		state.warm = null
	}, TOOLTIP_SKIP_DELAY_MS)
}

/** Показывать ли без задержки: другая подсказка открыта или закрылась только что. */
export function tooltipSkipsDelay(doc: Document): boolean {
	const state = STATES.get(doc)

	return !!state && (state.open !== null || state.warm !== null)
}

function stopWarm(state: TTooltipDocumentState): void {
	if (state.warm === null) return

	clearTimeout(state.warm)
	state.warm = null
}
