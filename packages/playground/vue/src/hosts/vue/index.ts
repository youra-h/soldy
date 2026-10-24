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

/** Сколько приложений превью смонтировано — номер в префиксе id следующего (см. `mount`). */
let apps = 0

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
 *
 * Префикс id у каждого приложения свой (`app.config.idPrefix`). `useId` Vue
 * выводит id из места в дереве приложения, и у двух одинаковых превью — их по
 * два на строку страницы — совпали бы id монтирования, а с ними `id` частей и
 * пометки панелей владельцами (`data-owner`). Плагины слоя находят панель по
 * пометке первой в документе, и жест, фокус и немой фон уходили бы на чужую
 * скрытую панель. Несколько приложений на странице Vue и просит различать
 * префиксом; `v` — по умолчанию, у оболочки. Сторожит «пометки панелей
 * владельцами не повторяются» в `__tests__/smoke/suite.ts`.
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

		app.config.idPrefix = `preview${++apps}`
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
