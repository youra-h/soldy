import type { TScenario } from '../types'

/** События плагина действия в порядке, в котором их ждёт сценарий клавиатуры. */
const ACTION = ['action:focus', 'action:press', 'action:blur'] as const

/**
 * События Button, которые опрос свойств не покрывает: нажатие, клавиатура,
 * выключенное состояние. Опрос свойств — `eventsPoll` в реестре.
 */
export const BUTTON_EVENTS: readonly TScenario[] = [
	{
		id: 'button/events/text',
		component: 'button',
		topic: 'events',
		kind: 'auto',
		title: 'Смена text через экземпляр',
		description:
			'Пишет text в экземпляр ядра: потребитель получает ровно одно change:text, и новый текст виден в DOM',
		props: { text: 'Прежний текст' },
		run: async (ctx) => {
			const from = ctx.journal.entries.length

			ctx.instance.text = 'Новый текст'
			await ctx.frame()

			const count = ctx.journal.count('change:text', from)
			const shown = ctx.scene.querySelector('.s-button__text')?.textContent?.trim()

			ctx.check(count === 1, `change:text пришло ровно один раз (пришло ${count})`)
			ctx.check(shown === 'Новый текст', `в DOM новый текст (в DOM «${shown ?? ''}»)`)
		},
	},
	{
		id: 'button/events/press',
		component: 'button',
		topic: 'events',
		kind: 'manual',
		title: 'Нажатие мышью',
		description: 'Клик доходит до потребителя событием action:press — по одному на клик',
		steps: ['Нажмите кнопку в сцене два раза'],
		props: { text: 'Нажми меня' },
		run: async (ctx) => {
			await ctx.events('action:press', 2)
			// Дать дойти лишнему, если клик порождает два нажатия
			await ctx.pause(100)

			const presses = ctx.journal.count('action:press')
			const clicks = ctx.journal.count('action:click')

			ctx.check(presses === 2, `action:press пришло два раза (пришло ${presses})`)
			ctx.check(clicks === presses, `action:click — по одному на нажатие (пришло ${clicks})`)
		},
	},
	{
		id: 'button/events/keyboard',
		component: 'button',
		topic: 'events',
		kind: 'manual',
		title: 'Клавиатура',
		description:
			'Фокус, нажатие с клавиатуры и уход фокуса доходят до потребителя: action:focus, по action:press на Enter и Space, action:blur',
		// Клик по сцене ставит на неё точку старта обхода, а кнопка — её
		// потомок и идёт следом: Tab попадает на неё, где бы ни кликнули
		steps: [
			'Кликните по пустому месту сцены',
			'Нажмите Tab — кнопка получает фокус',
			'Нажмите Enter, затем Space',
			'Нажмите Shift+Tab — фокус уходит с кнопки',
		],
		props: { text: 'С клавиатуры' },
		run: async (ctx) => {
			await ctx.events('action:blur')
			await ctx.pause(100)

			const order = ctx.journal.names(ACTION)
			const expected = ['action:focus', 'action:press', 'action:press', 'action:blur']

			ctx.check(
				order.join(' → ') === expected.join(' → '),
				`порядок: ${expected.join(' → ')} (пришло: ${order.join(' → ') || 'ничего'})`,
			)
			ctx.check(ctx.instance.focused === false, 'focused экземпляра снова false')
		},
	},
	{
		id: 'button/events/disabled',
		component: 'button',
		topic: 'events',
		kind: 'manual',
		title: 'Выключенная кнопка молчит',
		description:
			'На disabled кнопка не отдаёт action:press ни на клик, ни с клавиатуры и не получает фокус',
		steps: [
			'Кликните по кнопке',
			'Кликните по пустому месту сцены и нажмите Tab — фокус должен пропустить кнопку',
		],
		props: { text: 'Выключена', disabled: true },
		run: async (ctx) => {
			const button = ctx.scene.querySelector('.s-button')
			let clicked = false
			let tabbed = false

			// Нативного `click` выключенная `<button>` не отдаёт, а тема к тому же
			// снимает с неё `pointer-events`: `pointerdown` приходит сцене под
			// ней. Поэтому попытка нажать — это нажатие в прямоугольнике кнопки
			ctx.scene.addEventListener(
				'pointerdown',
				(event) => {
					const rect = button?.getBoundingClientRect()

					if (!rect) return

					clicked ||=
						event.clientX >= rect.left &&
						event.clientX <= rect.right &&
						event.clientY >= rect.top &&
						event.clientY <= rect.bottom
				},
				{ capture: true, signal: ctx.signal },
			)
			ctx.scene.ownerDocument.addEventListener(
				'keydown',
				(event) => {
					if (clicked && event.key === 'Tab') tabbed = true
				},
				{ signal: ctx.signal },
			)

			const heard = () =>
				ctx.journal.count('action:press') + ctx.journal.count('action:focus')

			await ctx.until(() => heard() > 0 || (clicked && tabbed), 'клик по кнопке и Tab')
			// Фокус приходит не сразу за keydown
			await ctx.pause(300)

			const presses = ctx.journal.count('action:press')
			const focuses = ctx.journal.count('action:focus')

			ctx.check(presses === 0, `action:press не пришло (пришло ${presses})`)
			ctx.check(focuses === 0, `фокус кнопку пропустил (action:focus пришло ${focuses})`)
		},
	},
]
