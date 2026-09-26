import type { TScenario } from '../types'

/** Значение под бегом «Загрузки»: к этой доле полоса придёт, когда бег снимут. */
const HELD = 40

/** Доли после бега — шагами до конца шкалы. */
const STEPS = [55, 70, 85, 100] as const

/** Сколько держать бег, мс. */
const RUN_HOLD = 3000

/** Сколько держать каждую долю, мс. */
const STEP_HOLD = 800

/** Сколько держать полную полосу перед новым бегом, мс. */
const DONE_HOLD = 1500

/** Последний шаг любого сценария темы. */
const VERDICT = 'Всё так — ✓, иначе ✗'

/** Просьба системы убрать движение — как её включить на стенде. */
const REDUCE = 'DevTools → Rendering → prefers-reduced-motion: reduce'

/**
 * Движение ProgressLinear — то, что оценивает только глаз: ровность и
 * скорость бега, его направление, переход доли. Машина сторожит, что отрезок
 * идёт туда, куда должен, а доля едет переходом
 * (`playground/vue/browser/progress-linear.spec.ts`); плавно ли это и не
 * читается ли пульс как «готово», видно только на сцене.
 *
 * Все ручные и на превью, без фикстур: слотов у полосы нет.
 */
export const PROGRESS_LINEAR_MOTION: readonly TScenario[] = [
	{
		id: 'progress-linear/motion/run',
		component: 'progress-linear',
		topic: 'motion',
		kind: 'manual',
		title: 'Бег',
		description: 'Доля неизвестна: отрезок бежит по дорожке от начала строки к концу',
		props: { indeterminate: true },
		steps: [
			'Отрезок идёт с ровной скоростью: не разгоняется, не тормозит и не висит у краёв',
			'Потяните сцену за угол: в узкой и в широкой бег ровный, в широкой отрезок быстрее — скорость растёт с длиной дорожки',
			'Включите «Тёмная» в шапке: в обеих схемах отрезок хорошо виден на дорожке',
			`${REDUCE} — отрезок не бежит, а дышит во всю дорожку и полной плотности не набирает: пульс не читается как «готово»`,
			VERDICT,
		],
	},
	{
		id: 'progress-linear/motion/run-rtl',
		component: 'progress-linear',
		topic: 'motion',
		kind: 'manual',
		title: 'Бег в RTL',
		description: 'Тот же бег при письме справа налево: отрезок идёт от правого края к левому',
		props: { indeterminate: true, direction: 'rtl' },
		steps: [
			'Отрезок выходит из-за правого края дорожки и уходит за левый — зеркально бегу без RTL',
			'Скорость и ровность — те же, что у бега слева направо',
			`${REDUCE} — тот же пульс во всю дорожку`,
			VERDICT,
		],
	},
	{
		id: 'progress-linear/motion/run-vertical',
		component: 'progress-linear',
		topic: 'motion',
		kind: 'manual',
		title: 'Вертикальный бег',
		description: 'Вертикальная полоса с неизвестной долей: отрезок бежит снизу вверх',
		props: { indeterminate: true, orientation: 'vertical' },
		steps: [
			'Полоса стоит столбиком в 160 px высотой, толщиной как горизонтальная',
			'Отрезок выходит из-за нижнего края и уходит за верхний, с ровной скоростью',
			`${REDUCE} — тот же пульс во всю полосу`,
			VERDICT,
		],
	},
	{
		id: 'progress-linear/motion/loading',
		component: 'progress-linear',
		topic: 'motion',
		kind: 'manual',
		title: 'Загрузка',
		description:
			'Цикл загрузки по кругу: бег, потом доля растёт от нуля и шагами доходит до конца, и снова бег',
		props: { value: HELD, indeterminate: true },
		steps: [
			`Сцена по кругу: бег ${RUN_HOLD / 1000} с, под ним значение ${HELD}; бег снят — заливка растёт от нуля до ${HELD} %, а не возникает сразу; дальше шагами до 100 % и снова бег`,
			'Каждый шаг доли едет плавно и без рывков, заливка не отстаёт от шагов',
			'Полная полоса читается как «готово», и бег с ней не путается',
			`${REDUCE} — доля встаёт на каждый шаг сразу, бег — пульс`,
			VERDICT,
		],
		run: async (ctx) => {
			// Круг за кругом, пока человек не поставит итог: отметка отменяет
			// прогон, и `pause` обрывает цикл. Сам цикл не кончается — иначе
			// сценарий засчитался бы без человека
			while (!ctx.signal.aborted) {
				// Бег поверх значения: доли на полосе нет, а значение хранится
				ctx.instance.value = HELD
				ctx.instance.indeterminate = true
				await ctx.pause(RUN_HOLD)

				// Бег снят — заливка идёт от нуля к значению, которое держалось
				// под ним
				ctx.instance.indeterminate = false
				await ctx.pause(STEP_HOLD)

				for (const value of STEPS) {
					ctx.instance.value = value
					await ctx.pause(STEP_HOLD)
				}

				await ctx.pause(DONE_HOLD)
			}
		},
	},
]
