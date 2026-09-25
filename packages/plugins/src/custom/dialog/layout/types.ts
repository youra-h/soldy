import type { TModalLayoutPluginEvents } from '../../overlay/modal-layout'
import type { TDialogOffsetEvent } from './offset-event'

/** События раскладки окна: общие с раскладкой модального слоя и отступ окна. */
export type TDialogLayoutPluginEvents = TModalLayoutPluginEvents & {
	/**
	 * offset:before — отступы окна от краёв экрана перед раскладкой. Подписчик
	 * правит стороны по отдельности (`e.top`, `e.bottom`, `e.start`, `e.end`)
	 * или отменяет отступы целиком (`e.preventDefault()`). Приходит на каждый
	 * пересчёт стилей окна.
	 */
	'offset:before': (e: TDialogOffsetEvent) => void
}
