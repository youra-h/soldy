import { createApp, h, shallowRef, type Component } from 'vue'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/vue'
import { findComponent, type IPreviewHost } from '@soldy-ui/playground-shared'
import { PREVIEW_COMPONENTS } from './previews'
import { FIXTURE_COMPONENTS } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'

/**
 * Язык шапки — один на все корни хоста. Корень читает его на отрисовке, и
 * смена доходит до провайдера каждого корня без перемонтирования.
 */
const locale = shallowRef<TLocale>(enUS)

/** Чем рисовать: фикстура по ключу, без ключа — превью компонента. */
function drawing(component: string, fixture: string | undefined): Component {
	const found =
		fixture === undefined ? PREVIEW_COMPONENTS[component] : FIXTURE_COMPONENTS[fixture]

	if (!found) throw new Error(`[playground] хост Vue не умеет рисовать «${fixture ?? component}»`)

	return found
}

/**
 * Хост Vue.
 *
 * Превью монтируется своим приложением (`createApp`) на узел оболочки, а не
 * деревом оболочки: так же рисуют и хосты остальных фреймворков, и дорога
 * отрисовки у всех одна. Корень — `LocaleProvider`: контекст оболочки
 * (`provide`) в чужое приложение не проходит, и язык шапки корню даёт хост.
 *
 * Пропсы приложение держит в своём `shallowRef`: `update` подменяет набор
 * целиком, и Vue отдаёт компоненту то, что сменилось.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEW_COMPONENTS),
	fixtures: Object.keys(FIXTURE_COMPONENTS),

	mount(node, { component, fixture, props, onEvent }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(entry, onEvent) : {}
		const bind = shallowRef(props)
		const app = createApp({
			render: () =>
				h(LocaleProvider, { locale: locale.value }, () =>
					h(preview, { ...bind.value, ...listeners }),
				),
		})

		app.mount(node)

		return {
			update(next) {
				bind.value = next
			},
			unmount() {
				app.unmount()
			},
		}
	},

	setLocale(next) {
		locale.value = next
	},

	snippets: { extension: 'vue', propSnippet, instanceSnippet },
}

export default host
