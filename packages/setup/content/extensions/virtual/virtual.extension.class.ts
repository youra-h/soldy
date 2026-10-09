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
 * Работа разделена по фазам контекста коллекции, как у связки панели Tabs
 * (`TTabsContentBindingExtension`):
 *
 * - **сборка** — плагин в набор и стратегия по текущему `enabled`: то и
 *   другое принадлежит коллекции, поэтому сервер и первый кадр уже в окне;
 * - **вход** (`attach`) — подписка на выключатель обёртки и его повторное
 *   применение. Шина обёртки для коллекции чужая, а собранную коллекцию
 *   фреймворк вправе выбросить, так и не приняв: подписка сборки осталась бы
 *   на живой обёртке, и снять её было бы некому — у списка из `items` нет ни
 *   `ctrl`, ни движка снаружи, по которым узнают выброшенную сборку;
 * - **снятие** (`destroy`) — отписка, если подписка была, и рисование всех
 *   элементов: движок мог прийти снаружи и пережить компонент. Плагин уходит
 *   вместе с набором компонента.
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
import type { IVirtualConnection, IVirtualExtensionOptions } from './types'

/** Подключение коллекции без рисования: окну у неё нечего держать. */
const NO_WINDOW: IVirtualConnection = {
	attach: () => {},
	destroy: () => {},
}

export class TVirtualExtension {
	constructor(context: TInstanceContext<IVirtual>, options: IVirtualExtensionOptions) {
		const virtual = context.instance

		options
			.elevator(VIRTUAL_ELEVATOR)
			.down((engine, bundle) => connectWindow(virtual, engine, bundle))
	}
}

/**
 * Подключить коллекцию к окну обёртки: своё коллекции — сразу, подписка на
 * обёртку — с приёмом коллекции.
 */
function connectWindow(
	virtual: IVirtual,
	engine: TCollectionEngine<any, any>,
	bundle: IPluginBundle | null,
): IVirtualConnection {
	const draw = drawOf<TDrawable>(engine)

	if (!draw) return NO_WINDOW

	if (bundle && !bundle.get(TVirtualPlugin)) bundle.use(TVirtualPlugin)

	const strategy = new TWindowStrategy()
	const apply = (enabled: boolean): void => draw.useStrategy(enabled ? strategy : null)
	/** Коллекцию приняли: на выключатель обёртки подписаны. */
	let listening = false

	apply(virtual.enabled)

	return {
		attach: () => {
			listening = true
			virtual.events.on('change:enabled', apply)

			// Выключатель мог смениться между сборкой и приёмом
			apply(virtual.enabled)
		},
		destroy: () => {
			if (listening) virtual.events.off('change:enabled', apply)

			listening = false
			draw.useStrategy(null)
		},
	}
}
