import type { IScenarioContext, TScenario } from '../types'

/** Текст подписи — пропом `text` сценария. */
const TEXT = 'Подпись'

/** Стоит ли узел `a` в документе раньше `b`. */
function precedes(a: Element, b: Element): boolean {
	return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

/**
 * Проверки подписи — одни на любой контрол в слоте `default`.
 *
 * Связь подписи с контролом — вложение, без `for` и `id`. Поэтому всё, что
 * стоит проверить, видно в DOM: контрол лежит в `label` и он у поля
 * единственный (`input.labels`), текст — после контрола, а клик по тексту
 * браузер отдаёт полю один раз.
 */
async function checkLabel(ctx: IScenarioContext): Promise<void> {
	const root = ctx.scene.querySelector('.so-label')

	if (!root) {
		ctx.check(false, 'подпись .so-label в сцене')
		return
	}

	ctx.check(root.localName === 'label', `корень подписи — label (пришёл ${root.localName})`)

	const input = root.querySelector('.so-label__control input')
	const text = root.querySelector('.so-label__text')

	if (!(input instanceof HTMLInputElement) || !(text instanceof HTMLElement)) {
		ctx.check(false, 'контрол — поле в .so-label__control, текст — в .so-label__text')
		return
	}

	ctx.check(text.textContent === TEXT, `текст из пропа text (пришло «${text.textContent ?? ''}»)`)
	ctx.check(precedes(input, text), 'порядок в DOM: контрол, потом текст')

	const labels = [...(input.labels ?? [])]

	ctx.check(
		labels.length === 1 && labels[0] === root,
		`у поля одна подпись — сама Label, вложенного label нет (подписей: ${labels.length})`,
	)

	let changes = 0

	input.addEventListener('change', () => changes++, { signal: ctx.signal })

	text.click()
	await ctx.frame()

	ctx.check(input.checked, 'клик по тексту отметил контрол')
	ctx.check(changes === 1, `поле получило один change (пришло ${changes})`)
}

/**
 * Подпись вокруг трёх контролов: CheckBox, Switch и радио. Разметку кладут
 * фикстуры адаптера (`label-*`); радио в них — с `tag="span"`, потому что его
 * собственный корень — тоже `label`. Контрол сценарий проверяет вместе с
 * подписью (`requires`): адаптер без него сценарий не покажет.
 */
export const LABEL_SLOTS: readonly TScenario[] = [
	{
		id: 'label/slots/check-box',
		component: 'label',
		topic: 'slots',
		kind: 'auto',
		title: 'CheckBox в подписи',
		description:
			'Чекбокс в слоте default лежит в .so-label__control, текст — после него; клик по тексту отмечает чекбокс одним change',
		fixture: 'label-check-box',
		requires: ['check-box'],
		props: { text: TEXT },
		run: checkLabel,
	},
	{
		id: 'label/slots/switch',
		component: 'label',
		topic: 'slots',
		kind: 'auto',
		title: 'Switch в подписи',
		description:
			'Переключатель в слоте default лежит в .so-label__control, текст — после него; клик по тексту включает его одним change',
		fixture: 'label-switch',
		requires: ['switch'],
		props: { text: TEXT },
		run: checkLabel,
	},
	{
		id: 'label/slots/radio',
		component: 'label',
		topic: 'slots',
		kind: 'auto',
		title: 'Радио в подписи',
		description:
			'RadioGroup.Item с tag="span" в слоте default: вложенного label нет, клик по тексту отмечает радио одним change',
		fixture: 'label-radio',
		requires: ['radio-group'],
		// Радио в подписи — на `span`: тег корня фикстура задаёт пропом
		tagProp: true,
		props: { text: TEXT },
		run: checkLabel,
	},
]
