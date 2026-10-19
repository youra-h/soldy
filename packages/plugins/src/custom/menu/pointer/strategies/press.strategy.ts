import type { IDomEventTarget } from '../../../../utils'
import type { IMenuOpenHost, IMenuOpenStrategy } from './types'

/**
 * TMenuPressStrategy — меню у кнопки (`openOn: 'press'`): клик по корню
 * переключает меню.
 *
 * В корне лежит только триггер (слот `trigger`), поэтому клик по корню — клик
 * по триггеру, чем бы потребитель его ни нарисовал. Клик из Enter и пробела
 * на `<button>` браузер делает сам, но до него не доходит: эти клавиши берёт
 * клавиатура меню — открыть на первом пункте. По открытому триггеру клик
 * закрывает меню без мигания: корень — внутри владельца, и `pointerdown`
 * перед кликом `TDismissPlugin` мимо не считает.
 *
 * `contextmenu` над кнопкой не трогается: контекстного меню у неё нет, и
 * браузер показывает своё.
 */
export class TMenuPressStrategy implements IMenuOpenStrategy {
	/** Узел нужен только под слушатель — отсюда и тип. */
	private readonly _root: IDomEventTarget
	private readonly _host: IMenuOpenHost

	constructor(root: Element, host: IMenuOpenHost) {
		this._root = root
		this._host = host

		this._root.addEventListener('click', this._onClick)
	}

	destroy(): void {
		this._root.removeEventListener('click', this._onClick)
	}

	private readonly _onClick = (): void => {
		this._host.toggle()
	}
}
