import { createApp, h, shallowRef } from 'vue'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/vue'
import {
	componentDescriptors,
	findComponent,
	partsOf,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import { PREVIEWS, toComponent, type TPreview } from './previews'
import { FIXTURES } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'

/**
 * Язык шапки — один на все корни хоста. Корень читает его на отрисовке, и
 * смена доходит до провайдера каждого корня без перемонтирования.
 */
const locale = shallowRef<TLocale>(enUS)

/** Сколько приложений превью смонтировано — номер в префиксе id следующего (см. `mount`). */
let apps = 0

/** What to draw with: a fixture by its key, without one — the component's preview. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

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
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent, count = 1 }) {
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(componentDescriptors(entry), onEvent) : {}
		// A fixture's markup is its own: its parts are not listened to
		const parts =
			entry && onEvent && fixture === undefined ? partsOf(entry, onEvent, listenersOf) : {}
		const preview = toComponent(drawing(component, fixture), parts)
		const bind = shallowRef(props)
		const app = createApp({
			render: () =>
				h(LocaleProvider, { locale: locale.value }, () =>
					Array.from({ length: count }, (_, key) =>
						h(preview, { ...bind.value, ...listeners, key }),
					),
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
