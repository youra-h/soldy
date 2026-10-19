import type { INumberInput } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import { buttonOf, inputOf, isButtonDisabled } from '../parts'
import type { TNumberInputButton } from '../types'
import type {
	INumberInputStepperPluginOptions,
	TNumberInputHold,
	TNumberInputStepperPluginEvents,
} from './types'

/** Сколько ждать до повтора, когда кнопку держат, мс, — пока опция не задана. */
const REPEAT_DELAY = 400

/** Шаг повтора, мс, — пока опция не задана. */
const REPEAT_INTERVAL = 60

/**
 * Указатели, нажатие которых ставит фокус во ввод: мышь и перо. Палец — нет:
 * фокус во вводе открыл бы экранную клавиатуру поверх кнопок, которые жмут.
 */
const FOCUSING_POINTERS: ReadonlySet<string> = new Set(['mouse', 'pen'])

/**
 * TNumberInputStepperPlugin — кнопки шага «меньше» и «больше»: нажатие,
 * удержание и активация скринридером.
 *
 * **Нажатие** основной кнопкой на включённой кнопке шага гасится
 * (`preventDefault`): фокус остаётся во вводе, и кольцо поля не гаснет, а
 * текст не выделяется. Мышь и перо ставят фокус во ввод, если его там не было,
 * — клавиши продолжают с того же числа; палец — нет. Шаг — сразу, а пока
 * кнопку держат, через `repeatDelay` он повторяется каждые `repeatInterval`
 * до края. Пока держат, у кнопки `data-pressed` в её наборе (`incrementDataset`,
 * `decrementDataset`): удержание видно и там, где браузер у погашенного нажатия
 * не ставит `:active`.
 *
 * **Конец удержания** — отпускание, отмена указателя (палец увёл прокрутку),
 * уход указателя с кнопки, выключенная кнопка (край, `disabled`, `readonly`) и
 * снятый узел. Удержание — одно действие: `commit()` в конце, одно событие
 * `commit` на всю серию шагов.
 *
 * **Скринридер** жмёт кнопку без указателя — `click` с `detail === 0`: шаг и
 * `commit()`. Клик мышью кончает нажатие, уже исполненное, и шага не делает.
 * Контекстное меню над кнопкой гасится: долгое касание — удержание, а не меню.
 *
 * Кнопки — по классам владельца в его корне; слушатели — на корне.
 */
export class TNumberInputStepperPlugin extends TBasePlugin<
	INumberInput,
	TNumberInputStepperPluginEvents
> {
	private _owner: INumberInput | null = null
	private _root: Element | null = null
	private _hold: TNumberInputHold | null = null
	private _repeatDelay = REPEAT_DELAY
	private _repeatInterval = REPEAT_INTERVAL

	override install(ctx: IPluginContext, options?: INumberInputStepperPluginOptions): void {
		super.install(ctx, options)

		this._repeatDelay = options?.repeatDelay ?? this._repeatDelay
		this._repeatInterval = options?.repeatInterval ?? this._repeatInterval
		this._owner = ctx.getInstance<INumberInput>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))

		// Поле выключили или сделали только для чтения — держать нечего. Край
		// проверяет сам шаг: закрыть действие изнутри `change:value` значило бы
		// писать значение посреди рассылки о нём
		this._listenTo(this._owner?.events, 'change:disabled', this._onLock)
		this._listenTo(this._owner?.events, 'change:readonly', this._onLock)
	}

	override destroy(): void {
		this._bind(null)
		this._owner = null

		super.destroy()
	}

	/** Корень сменился — слушатели переезжают; удержание на снятом узле кончается. */
	private _bind(root: Element | null): void {
		this._release()

		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('pointerdown', this._onPointerDown)
		previous?.removeEventListener('pointerup', this._onPointerUp)
		previous?.removeEventListener('pointercancel', this._onPointerUp)
		previous?.removeEventListener('pointerout', this._onPointerOut)
		previous?.removeEventListener('click', this._onClick)
		previous?.removeEventListener('contextmenu', this._onContextMenu)

		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('pointerdown', this._onPointerDown)
		target?.addEventListener('pointerup', this._onPointerUp)
		target?.addEventListener('pointercancel', this._onPointerUp)
		target?.addEventListener('pointerout', this._onPointerOut)
		target?.addEventListener('click', this._onClick)
		target?.addEventListener('contextmenu', this._onContextMenu)
	}

	private readonly _onPointerDown = (event: PointerEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || event.button !== 0) return

		const button = buttonOf(owner, root, event.target)

		if (!button || isButtonDisabled(owner, button.direction)) return

		// Фокус остаётся во вводе, а текст под указателем не выделяется
		event.preventDefault()

		if (FOCUSING_POINTERS.has(event.pointerType)) {
			const input = inputOf(owner, root)

			if (input && root.ownerDocument.activeElement !== input) input.focus()
		}

		this._press(owner, button)
	}

	private readonly _onPointerUp = (): void => {
		this._release()
	}

	/** Указатель ушёл с кнопки — не на её же значок, а наружу. */
	private readonly _onPointerOut = (event: PointerEvent): void => {
		const hold = this._hold
		const related = event.relatedTarget

		if (!hold || (related instanceof Node && hold.button.element.contains(related))) return
		if (event.target instanceof Node && hold.button.element.contains(event.target)) {
			this._release()
		}
	}

	/** Нажатие без указателя — скринридер или клавиша на кнопке: один шаг. */
	private readonly _onClick = (event: MouseEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || event.detail !== 0) return

		const button = buttonOf(owner, root, event.target)

		if (!button || isButtonDisabled(owner, button.direction)) return

		owner.shift(button.direction)
		owner.commit()
	}

	private readonly _onContextMenu = (event: Event): void => {
		const owner = this._owner
		const root = this._root

		if (owner && root && buttonOf(owner, root, event.target)) event.preventDefault()
	}

	/** Кнопка выключилась под удержанием — удержание кончено. */
	private readonly _onLock = (): void => {
		const owner = this._owner
		const hold = this._hold

		if (owner && hold && isButtonDisabled(owner, hold.button.direction)) this._release()
	}

	/** Нажали: шаг сразу, `data-pressed`, а через задержку — повтор. */
	private _press(owner: INumberInput, button: TNumberInputButton): void {
		this._release()

		this._hold = { button, timer: setTimeout(this._repeat, this._repeatDelay) }
		datasetOf(owner, button.direction).add('pressed', true)

		this._step(owner, button.direction)
	}

	/** Повтор шага, пока держат. */
	private readonly _repeat = (): void => {
		const owner = this._owner
		const hold = this._hold

		if (!owner || !hold) return

		hold.timer = setTimeout(this._repeat, this._repeatInterval)
		this._step(owner, hold.button.direction)
	}

	/**
	 * Шаг удержания. Дошёл до края — кнопка выключена, и удержание кончено; край
	 * значения, записанного снаружи, следующий шаг увидит так же.
	 */
	private _step(owner: INumberInput, direction: 1 | -1): void {
		owner.shift(direction)

		if (isButtonDisabled(owner, direction)) this._release()
	}

	/** Отпустили: повтора нет, `data-pressed` снят, действие закрыто — `commit()`. */
	private _release(): void {
		const owner = this._owner
		const hold = this._hold

		if (!hold) return

		this._hold = null
		clearTimeout(hold.timer)

		if (!owner) return

		datasetOf(owner, hold.button.direction).add('pressed', null)
		owner.commit()
	}
}

/** Набор темы кнопки шага в эту сторону. */
function datasetOf(owner: INumberInput, direction: 1 | -1) {
	return direction > 0 ? owner.incrementDataset : owner.decrementDataset
}
