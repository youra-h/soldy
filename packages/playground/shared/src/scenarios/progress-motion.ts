import { MOTION_MODES } from '../registry'
import type { IScenarioContext } from './types'

/**
 * Движение индикаторов выполнения — общее у линии и кольца.
 *
 * Модель у них одна (`TProgress` в ядре): бег — флаг, доля — значение на
 * шкале. Поэтому и сцена «Загрузка» у них одна, и шаги ручных сценариев
 * говорят об одном и том же. Разойдись две копии цикла, линию и кольцо
 * смотрели бы на разных сценах.
 */

/** Последний шаг любого сценария движения. */
export const VERDICT = 'Всё так — ✓, иначе ✗'

/**
 * Движение убрано — как это включить на стенде: режимом в шапке, не трогая
 * настройку системы. Тема рисует его так же, как просьбу системы.
 */
export const REDUCE = `Выберите в шапке «Анимация движения» → «${MOTION_MODES.reduce}»`

/** Цикл «Загрузки»: сколько и что держит сцена на каждом шаге. */
export const LOADING = {
	/** Значение под бегом: к этой доле индикатор придёт, когда бег снимут */
	held: 40,
	/** Доли после бега — шагами до конца шкалы */
	steps: [55, 70, 85, 100],
	/** Сколько держать бег, мс */
	runHold: 3000,
	/** Сколько держать каждую долю, мс */
	stepHold: 800,
	/** Сколько держать полную шкалу перед новым бегом, мс */
	doneHold: 1500,
} as const

/** Стартовые пропы «Загрузки»: бег поверх значения, которое держится под ним. */
export const LOADING_PROPS: Readonly<Record<string, unknown>> = {
	value: LOADING.held,
	indeterminate: true,
}

/**
 * `run` «Загрузки»: круг за кругом бег, потом доля от нуля шагами до конца
 * шкалы, и снова бег.
 *
 * Сцена крутится, пока человек не поставит итог: отметка отменяет прогон, и
 * `pause` обрывает цикл. Сам цикл не кончается — иначе сценарий засчитался бы
 * без человека (`TManualScenario.run`).
 */
export async function loadingCycle(ctx: IScenarioContext): Promise<void> {
	while (!ctx.signal.aborted) {
		// Бег поверх значения: доли на индикаторе нет, а значение хранится
		ctx.instance.value = LOADING.held
		ctx.instance.indeterminate = true
		await ctx.pause(LOADING.runHold)

		// Бег снят — доля идёт от нуля к значению, которое держалось под ним
		ctx.instance.indeterminate = false
		await ctx.pause(LOADING.stepHold)

		for (const value of LOADING.steps) {
			ctx.instance.value = value
			await ctx.pause(LOADING.stepHold)
		}

		await ctx.pause(LOADING.doneHold)
	}
}
