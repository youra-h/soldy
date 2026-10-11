import { flushSync, mount, unmount } from 'svelte'
import { findComponent, type IPreviewHost } from '@soldy-ui/playground-shared'
import { PREVIEWS, type TPreview, type TPreviewProps } from './previews'
import { FIXTURES } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'
import { TLive, language } from './live.svelte'
import Root from './Root.svelte'

/** Чем рисовать: фикстура по ключу, без ключа — превью компонента. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(`[playground] хост Svelte не умеет рисовать «${fixture ?? component}»`)
	}

	return found
}

/**
 * Хост Svelte.
 *
 * Превью — свой корень Svelte (`mount`) на узле оболочки, корень дерева —
 * `LocaleProvider` (`Root.svelte`): контекст оболочки в чужой корень не
 * проходит, и язык шапки корню даёт хост. Пропсы корня и язык — ячейки
 * `$state.raw` (`live.svelte.ts`): смена — новая отрисовка того же корня, а
 * не новое монтирование, и провайдер пишет новую локаль в свой источник —
 * компоненты не перемонтируются.
 *
 * Всё — через `flushSync`: контракт обещает компонент в DOM к возврату из
 * `mount`, а Svelte применяет смены на своём такте. Пропсы и язык оболочка
 * меняет из своих наблюдателей, вне такта Svelte, и синхронный сброс там
 * законен.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(entry, onEvent) : {}
		const bind = new TLive<TPreviewProps>({ ...props, ...listeners })
		const root = mount(Root, { target: node, props: { preview, bind } })

		flushSync()

		return {
			update(next) {
				bind.current = { ...next, ...listeners }
				flushSync()
			},
			unmount() {
				void unmount(root)
			},
		}
	},

	setLocale(next) {
		language.current = next
		flushSync()
	},

	snippets: { extension: 'svelte', propSnippet, instanceSnippet },
}

export default host
