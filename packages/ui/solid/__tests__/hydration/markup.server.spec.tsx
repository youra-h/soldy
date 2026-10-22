/**
 * Разметка сервера для гидратации — фикстуры прогона гидратации.
 *
 * Гидратации нужны обе сборки страницы сразу, а в одном прогоне компоненты
 * собраны под одно окружение. Поэтому разметку сервера пишет этот прогон:
 * рисует страницу `renderToString`, как сервер приложения, — с ключами
 * гидратации (`data-hk`) и метками вставок, — и сверяет её с фикстурой в
 * `markup/`. Прогон гидратации (`collections.hydration.spec.tsx`) кладёт
 * фикстуру в документ и гидратирует её той же страницей, собранной для
 * браузера. Разошлась разметка сервера с фикстурой — этот спек красный, и
 * фикстуры переписывает `vitest -u`: от сервера они не отстанут.
 */

import { describe, it, expect } from 'vitest'
import type { JSX } from 'solid-js'
import { renderToString } from 'solid-js/web'
import { RootProbe, TabsActiveFirst, TabsActiveSecond, TagsSelectedSecond } from './pages'

/** Страница и её фикстура — имя файла в `markup/`. */
const PAGES: ReadonlyArray<readonly [fixture: string, page: () => JSX.Element]> = [
	['tabs-active-second', () => <TabsActiveSecond />],
	['tabs-active-first', () => <TabsActiveFirst />],
	['tags-selected-second', () => <TagsSelectedSecond />],
	['root-probe', () => <RootProbe />],
]

describe('разметка сервера для гидратации', () => {
	it.each(PAGES)('%s — фикстура совпадает с разметкой сервера', async (fixture, page) => {
		await expect(renderToString(page)).toMatchFileSnapshot(`./markup/${fixture}.html`)
	})
})
