import type { TScenario } from '../types'

/** Слоты Button в порядке разметки. */
const SLOTS = ['leading', 'default', 'trailing'] as const

/** Ширины сцены ручного сценария: узко, средне, широко. */
const WIDTHS = [120, 240, 480] as const

/** Сколько держать каждую ширину, мс. */
const HOLD = 2000

/** Стоит ли узел `a` в документе раньше `b`. */
function precedes(a: Element, b: Element): boolean {
	return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

/**
 * Слоты Button. Содержимое кладут фикстуры адаптера (`button-slot-*`):
 * метки `data-probe` — для автоматического, иконки и длинный текст — для
 * ручного.
 */
export const BUTTON_SLOTS: readonly TScenario[] = [
	{
		id: 'button/slots/order',
		component: 'button',
		topic: 'slots',
		kind: 'auto',
		title: 'Порядок слотов и scope',
		description:
			'leading, default и trailing лежат внутри кнопки в этом порядке; scope text слота default совпадает с пропом text и следует за его сменой',
		fixture: 'button-slot-labels',
		props: { text: 'Метка' },
		run: async (ctx) => {
			const probe = (slot: string) =>
				ctx.scene.querySelector(`.s-button [data-probe="${slot}"]`)
			const [leading, main, trailing] = SLOTS.map(probe)
			const missing = SLOTS.filter((slot) => !probe(slot))

			ctx.check(
				!missing.length,
				`все три слота внутри .s-button (нет: ${missing.join(', ') || '—'})`,
			)

			if (leading && main && trailing) {
				ctx.check(
					precedes(leading, main) && precedes(main, trailing),
					'порядок: leading → default → trailing',
				)
			}

			ctx.check(
				Boolean(main?.closest('.s-button__text')),
				'default — внутри .s-button__text, иконочные слоты — снаружи',
			)
			ctx.check(
				main?.textContent === 'Метка',
				`scope text совпадает с пропом text (пришло «${main?.textContent ?? ''}»)`,
			)

			ctx.instance.text = 'Другая'
			await ctx.frame()

			const after = probe('default')?.textContent

			ctx.check(
				after === 'Другая',
				`после смены text через экземпляр scope обновился (пришло «${after ?? ''}»)`,
			)
		},
	},
	{
		id: 'button/slots/width',
		component: 'button',
		topic: 'slots',
		kind: 'manual',
		title: 'Иконки и длинный текст при разной ширине',
		description:
			'Кнопка с иконками в leading и trailing и длинной подписью в узкой, средней и широкой сцене',
		fixture: 'button-slot-icons',
		steps: [
			`Сцена по кругу меняет ширину: ${WIDTHS.join(', ')} px, по ${HOLD / 1000} с на каждую`,
			'Иконки не сжимаются и не наезжают на текст',
			'Текст переносится или обрезается так, как решила тема, и не вылезает за кнопку',
			'Всё так — ✓, иначе ✗. После отметки сцену можно тянуть мышью за угол',
		],
		props: { text: 'Очень длинная подпись кнопки, которая не поместится в узкую сцену' },
		run: async (ctx) => {
			// Круг за кругом, пока человек не поставит итог: отметка отменяет прогон
			while (!ctx.signal.aborted) {
				for (const width of WIDTHS) {
					ctx.resize(width)
					await ctx.pause(HOLD)
				}
			}
		},
	},
]
