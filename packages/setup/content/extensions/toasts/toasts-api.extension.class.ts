/**
 * TToastsApiExtension — менеджер `Toasts` отдаёт API тостов вниз по дереву.
 *
 * Приложение показывает тост из любого места под менеджером, не ставя
 * разметку на месте: `const { show } = useToasts()`. API — очередь движка
 * (`engine.extensions.toasts`): тот же объект, которым показывает тосты код
 * вне компонентов, получивший движок пропом `engine`. Второго пути к тостам
 * нет — опускается сама очередь, а не обёртка над ней.
 *
 * Расширение только опускает значение по лифту (`TOASTS_ELEVATOR`), а берёт
 * его адаптер — своим механизмом контекста: во Vue — `inject`. Ни
 * регистрации, ни подписок у него нет, поэтому фаз контекста оно не ждёт.
 *
 * Использование:
 *   collectionAdapter
 *     .use(TCollectionExtension, { elevator: VueElevatorFactory })
 *     .use(TToastsApiExtension, { elevator: VueElevatorFactory })
 */

import type { TInstanceContext } from '../../../protected/adapter/context'
import { TOASTS_ELEVATOR } from './keys'
import type { IToastsApiExtensionOptions, TToastsApiOwner } from './types'

export class TToastsApiExtension {
	constructor(context: TInstanceContext<TToastsApiOwner>, options: IToastsApiExtensionOptions) {
		options.elevator(TOASTS_ELEVATOR).down(context.instance.engine.extensions.toasts)
	}
}
