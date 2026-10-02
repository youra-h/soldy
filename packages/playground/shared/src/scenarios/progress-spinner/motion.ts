import { LOADING, LOADING_PROPS, REDUCE, VERDICT, loadingCycle } from '../progress-motion'
import type { TScenario } from '../types'

/**
 * Движение ProgressSpinner — то, что оценивает только глаз: ритм бега, рост
 * дуги, полное кольцо без шва. Машина сторожит, что рисунок крутится и при
 * просьбе системы убрать движение тоже, а доля едет переходом
 * (`playground/vue/browser/progress-spinner.spec.ts`); ровно ли это, видно
 * только на сцене.
 *
 * Все ручные и на превью, без фикстур: слотов у кольца нет. Цикл «Загрузки» —
 * общий с линией (`progress-motion.ts`).
 */
export const PROGRESS_SPINNER_MOTION: readonly TScenario[] = [
	{
		id: 'progress-spinner/motion/run',
		component: 'progress-spinner',
		topic: 'motion',
		kind: 'manual',
		title: 'Бег',
		description: 'Доля неизвестна: четверть кольца бежит по дорожке по часовой',
		props: { indeterminate: true },
		steps: [
			'Дуга — четверть кольца — идёт по часовой с разгоном и торможением на каждом круге и без рывка на стыке кругов',
			'Включите «Тёмная» в шапке: в обеих схемах дуга хорошо видна на дорожке',
			'DevTools → Elements: поставьте корню кольца dir="rtl" — бег тот же: по часовой и с тем же ритмом, кольцо не зеркалится',
			`${REDUCE} — бег тот же, что без просьбы`,
			VERDICT,
		],
	},
	{
		id: 'progress-spinner/motion/loading',
		component: 'progress-spinner',
		topic: 'motion',
		kind: 'manual',
		title: 'Загрузка',
		description:
			'Цикл загрузки по кругу: бег, потом дуга растёт от нуля и шагами замыкает кольцо, и снова бег',
		props: LOADING_PROPS,
		steps: [
			`Сцена по кругу: бег ${LOADING.runHold / 1000} с, под ним значение ${LOADING.held}; бег снят — дуга растёт от двенадцати часов по часовой от нуля до ${LOADING.held} %, а не возникает сразу; дальше шагами до 100 % и снова бег`,
			'Каждый шаг доли едет плавно и без рывков, дуга не отстаёт от шагов',
			'Полное кольцо — сплошное, без шва на двенадцати часах, и читается как «готово»; бег с ним не путается',
			`${REDUCE} — доля встаёт на каждый шаг сразу, бег тот же`,
			VERDICT,
		],
		run: loadingCycle,
	},
]
