import type { TScenario } from '../types'

/** События Button: смена свойства через экземпляр и нажатие мышью. */
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
]
