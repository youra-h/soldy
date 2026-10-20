import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/react'
import { findComponent, type IPreviewHost } from '@soldy-ui/playground-shared'
import { PREVIEWS, type TPreview } from './previews'
import { FIXTURES } from './fixtures'
import { listenersOf } from './events'
import { instanceSnippet, propSnippet } from './snippet'

/** Язык шапки — один на все корни хоста. */
let locale: TLocale = enUS

/** Отрисовки живых корней: смена языка перерисовывает каждый. */
const roots = new Set<() => void>()

/** Сколько корней превью смонтировано — номер в префиксе id следующего (см. `mount`). */
let mounted = 0

/** Чем рисовать: фикстура по ключу, без ключа — превью компонента. */
function drawing(component: string, fixture: string | undefined): TPreview {
	const found = fixture === undefined ? PREVIEWS[component] : FIXTURES[fixture]

	if (!found) {
		throw new Error(`[playground] хост React не умеет рисовать «${fixture ?? component}»`)
	}

	return found
}

/**
 * Хост React.
 *
 * Превью — свой корень React (`createRoot`) на узле оболочки, корень дерева —
 * `LocaleProvider`: контекст оболочки в чужой корень не проходит, и язык шапки
 * корню даёт хост. Смена языка перерисовывает корни с новой локалью
 * провайдера, а провайдер пишет её в свой источник — компоненты не
 * перемонтируются.
 *
 * Всё — через `flushSync`: контракт обещает компонент в DOM к возврату из
 * `mount`, а пропсы и язык оболочка меняет из своих наблюдателей, вне
 * отрисовки React, и синхронный сброс там законен. Отрисовка тем же корнем —
 * обновление, а не новое монтирование: React сверяет дерево с прежним.
 *
 * Префикс id у каждого корня свой (`identifierPrefix`), как `idPrefix` у
 * приложений хоста Vue. `useId` React выводит id из места в дереве корня, и у
 * двух одинаковых превью — их по два на строку страницы — совпали бы id
 * монтирования, а с ними `id` частей и пометки панелей владельцами
 * (`data-owner`). Плагины слоя находят панель по пометке первой в документе, и
 * жест, фокус и немой фон уходили бы на чужую скрытую панель. Несколько корней
 * на странице React и просит различать префиксом. Сторожит «пометки панелей
 * владельцами не повторяются» в `__tests__/smoke.spec.ts`.
 */
const host: IPreviewHost = {
	previews: Object.keys(PREVIEWS),
	fixtures: Object.keys(FIXTURES),

	mount(node, { component, fixture, props, onEvent }) {
		const preview = drawing(component, fixture)
		const entry = findComponent(component)
		const listeners = entry && onEvent ? listenersOf(entry, onEvent) : {}
		const root = createRoot(node, { identifierPrefix: `preview${++mounted}-` })
		let bind = props

		const draw = () =>
			flushSync(() =>
				root.render(
					createElement(LocaleProvider, { locale }, preview({ ...bind, ...listeners })),
				),
			)

		draw()
		roots.add(draw)

		return {
			update(next) {
				bind = next
				draw()
			},
			unmount() {
				roots.delete(draw)
				root.unmount()
			},
		}
	},

	setLocale(next) {
		locale = next

		for (const draw of roots) draw()
	},

	snippets: { extension: 'tsx', propSnippet, instanceSnippet },
}

export default host
