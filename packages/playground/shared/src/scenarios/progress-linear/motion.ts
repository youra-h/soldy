import { LOADING, LOADING_PROPS, REDUCE, VERDICT, loadingCycle } from '../progress-motion'
import type { TScenario } from '../types'

/**
 * Движение ProgressLinear — то, что оценивает только глаз: ровность и
 * скорость бега, его направление, переход доли. Машина сторожит, что отрезок
 * идёт туда, куда должен, и при просьбе системы убрать движение тоже, а доля
 * едет переходом (`playground/vue/browser/progress-linear.spec.ts`); плавно
 * ли это, видно только на сцене.
 *
 * Все ручные и на превью, без фикстур: слотов у полосы нет. Цикл «Загрузки» —
 * общий с кольцом (`progress-motion.ts`).
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
			`${REDUCE} — бег тот же, что без просьбы`,
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
			`${REDUCE} — бег тот же, что без просьбы`,
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
			`${REDUCE} — бег тот же, что без просьбы`,
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
		props: LOADING_PROPS,
		steps: [
			`Сцена по кругу: бег ${LOADING.runHold / 1000} с, под ним значение ${LOADING.held}; бег снят — заливка растёт от нуля до ${LOADING.held} %, а не возникает сразу; дальше шагами до 100 % и снова бег`,
			'Каждый шаг доли едет плавно и без рывков, заливка не отстаёт от шагов',
			'Полная полоса читается как «готово», и бег с ней не путается',
			`${REDUCE} — доля встаёт на каждый шаг сразу, бег тот же`,
			VERDICT,
		],
		run: loadingCycle,
	},
]
