import { createComponent, createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { PREVIEWS, type TPreview, type TPreviewProps } from './previews'
import { FIXTURES } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'
import { Root, setLanguage } from './Root'

/** Чем рисовать: фикстура по ключу, без ключа — превью компонента. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(`[playground] хост Solid не умеет рисовать «${fixture ?? component}»`)
	}

	return found
}

/**
 * Хост Solid.
 *
 * Превью — свой корень Solid (`render`) на узле оболочки, корень дерева —
 * `LocaleProvider` (`Root`): контекст оболочки в чужой корень не проходит, и
 * язык шапки корню даёт хост. Пропсы корня и язык — сигналы: тело компонента
 * Solid выполняется один раз, и смену он узнаёт только от сигнала. Смена
 * пропсов — новое значение сигнала, а не новое монтирование, и провайдер
 * пишет новую локаль в свой источник — компоненты не перемонтируются.
 *
 * Синхронно без сброса: Solid рисует корень и применяет смену сигнала тем же
 * вызовом, и к возврату из `mount`, `update` и `setLocale` DOM уже новый, как
 * обещает контракт.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent, count = 1 }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(componentDescriptors(entry), onEvent) : {}
		// A fixture's markup is its own: its parts are not listened to
		const parts =
			entry && onEvent && fixture === undefined ? partsOf(entry, onEvent, listenersOf) : {}
		const [bind, setBind] = createSignal<TPreviewProps>({ ...props, ...listeners })
		const dispose = render(() => createComponent(Root, { preview, bind, parts, count }), node)

		return {
			update(next) {
				setBind({ ...next, ...listeners })
			},
			unmount() {
				dispose()
			},
		}
	},

	setLocale(next) {
		setLanguage(next)
	},

	snippets: { extension: 'tsx', propSnippet, instanceSnippet },
}

export default host
