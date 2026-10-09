/**
 * TVirtualExtension — проводка обёртки `Virtual`: окно коллекциям внутри неё.
 *
 * Обёртка опускает по лифту подключение к окну, а коллекция внутри
 * подхватывает его при сборке (`TVirtualCollectionExtension`). Подключение
 * делает со своей коллекцией две вещи:
 *
 * - ставит в её набор плагинов `TVirtualPlugin` — замер видимой полосы и шага
 *   элементов и элемент с DOM-фокусом; движок к этому времени привязан к
 *   реестру bundles, и плагин берёт его оттуда;
 * - держит в её рисовании (`draw`) стратегию окна, пока обёртка включена
 *   (`enabled`), и снимает её, когда выключена.
 *
 * Снятие подключения — отписка от обёртки и рисование всех элементов: движок
 * мог прийти снаружи и пережить компонент. Плагин уходит вместе с набором
 * компонента.
 *
 * Использование:
 *   adapter.use(TVirtualExtension, { elevator: VueElevatorFactory })
 */

import { TWindowStrategy, drawOf } from '@soldy-ui/core'
import type { IVirtual, TCollectionEngine, TDrawable } from '@soldy-ui/core'
import { TVirtualPlugin } from '@soldy-ui/plugins'
import type { IPluginBundle } from '@soldy-ui/plugins'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { VIRTUAL_ELEVATOR } from './keys'
import type { IVirtualExtensionOptions } from './types'

export class TVirtualExtension {
	constructor(context: TInstanceContext<IVirtual>, options: IVirtualExtensionOptions) {
		const virtual = context.instance

		options
			.elevator(VIRTUAL_ELEVATOR)
			.down((engine, bundle) => attachWindow(virtual, engine, bundle))
	}
}

/** Подключить коллекцию к окну обёртки; отдаёт снятие. */
function attachWindow(
	virtual: IVirtual,
	engine: TCollectionEngine<any, any>,
	bundle: IPluginBundle | null,
): () => void {
	const draw = drawOf<TDrawable>(engine)

	if (!draw) return () => {}

	if (bundle && !bundle.get(TVirtualPlugin)) bundle.use(TVirtualPlugin)

	const strategy = new TWindowStrategy()
	const apply = (enabled: boolean): void => draw.useStrategy(enabled ? strategy : null)

	apply(virtual.enabled)
	virtual.events.on('change:enabled', apply)

	return () => {
		virtual.events.off('change:enabled', apply)
		draw.useStrategy(null)
	}
}
