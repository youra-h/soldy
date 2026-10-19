import type { INumberInput, TNumberInputEdge } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import type { IDomEventTarget } from '../../../utils'
import { isInputOf } from '../parts'
import type { TNumberInputKeyboardPluginEvents } from './types'

/** Края клавиш Home и End. Без границы на краю клавиша — каретки. */
const EDGES: ReadonlyMap<string, TNumberInputEdge> = new Map([
	['Home', 'start'],
	['End', 'end'],
])

/**
 * TNumberInputKeyboardPlugin — клавиши поля числа (APG, Spinbutton): шаг,
 * крупный шаг и границы.
 *
 * - **↑/↓** — шаг (`shift`), с Shift — крупный шаг (`largeStep` шагов);
 * - **PageUp/PageDown** — крупный шаг;
 * - **Home/End** — к заданной границе (`moveToEdge`); границы нет — клавиша
 *   браузера: каретка в начало или конец текста. С Shift — тоже браузера:
 *   выделение до края;
 * - **Enter** — конец набора (`commit`), без `preventDefault`: Enter в поле
 *   формы отправляет её, и значение уходит в форму уже законченным.
 *
 * Каждая клавиша шага — законченное действие: шаг и `commit()`. Обработанная
 * клавиша гасится `preventDefault` — иначе стрелка увела бы каретку, а PageDown
 * прокрутил бы страницу. У выключенного поля и только для чтения команды
 * ничего не меняют, а клавиши всё равно гасятся: счётчик своими стрелками
 * текст не листает.
 *
 * Клавиши берутся только с самого ввода, мимо композиции IME и мимо
 * Alt/Ctrl/Meta — это чужие жесты: Ctrl+Home у браузера, Alt+↓ у оверлеев.
 */
export class TNumberInputKeyboardPlugin extends TBasePlugin<
	INumberInput,
	TNumberInputKeyboardPluginEvents
> {
	private _owner: INumberInput | null = null
	private _root: Element | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<INumberInput>() ?? null

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', (element) => this._bind(element))
		elementPlugin?.events.on('removed', () => this._bind(null))
	}

	override destroy(): void {
		this._bind(null)
		this._owner = null

		super.destroy()
	}

	/** Корень сменился — слушатель переезжает. */
	private _bind(root: Element | null): void {
		const previous: IDomEventTarget | null = this._root

		previous?.removeEventListener('keydown', this._onKeyDown)

		this._root = root

		const target: IDomEventTarget | null = root

		target?.addEventListener('keydown', this._onKeyDown)
	}

	private readonly _onKeyDown = (event: KeyboardEvent): void => {
		const owner = this._owner
		const root = this._root

		if (!owner || !root || event.defaultPrevented || event.isComposing) return
		if (event.altKey || event.ctrlKey || event.metaKey) return
		if (!isInputOf(owner, root, event.target)) return

		if (event.key === 'Enter') {
			owner.commit()

			return
		}

		const action = this._actionOf(owner, event)

		if (!action) return

		event.preventDefault()
		action()
		owner.commit()
	}

	/** Что клавиша делает с числом; не клавиша поля — `null`, её обработает браузер. */
	private _actionOf(owner: INumberInput, event: KeyboardEvent): (() => void) | null {
		const large = owner.largeStep

		switch (event.key) {
			case 'ArrowUp':
				return () => owner.shift(event.shiftKey ? large : 1)
			case 'ArrowDown':
				return () => owner.shift(event.shiftKey ? -large : -1)
			case 'PageUp':
				return () => owner.shift(large)
			case 'PageDown':
				return () => owner.shift(-large)
		}

		const edge = EDGES.get(event.key)

		if (edge === undefined || event.shiftKey) return null

		const bound = edge === 'start' ? owner.min : owner.max

		return bound === undefined ? null : () => owner.moveToEdge(edge)
	}
}
