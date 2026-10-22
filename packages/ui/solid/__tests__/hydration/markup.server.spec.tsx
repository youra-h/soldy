/**
 * Разметка сервера для гидратации — фикстуры прогона гидратации.
 *
 * Гидратации нужны обе сборки страницы сразу, а в одном прогоне компоненты
 * собраны под одно окружение. Поэтому разметку сервера пишет этот прогон:
 * рисует страницу `renderToString`, как сервер приложения, — с ключами
 * гидратации (`data-hk`) и метками вставок, — и сверяет её с фикстурой в
 * `markup/`. Прогон гидратации (`*.hydration.spec.tsx`) кладёт фикстуру в
 * документ и гидратирует её той же страницей, собранной для браузера. Разошлась разметка сервера с фикстурой — этот спек красный, и
 * фикстуры переписывает `vitest -u`: от сервера они не отстанут.
 *
 * Страницу с границей `Suspense`, которая ждёт данных, сервер отдаёт потоком
 * (`renderToStream`): оболочку — сразу, с меткой на месте границы, а её
 * содержимое — следом, когда данные пришли, вместе со скриптом, который
 * ставит его на место метки. Фикстура такой страницы — поток целиком, как его
 * получает браузер; досланное от оболочки отделяет прогон гидратации
 * (`serveStreamed` в `serve.ts`).
 *
 * Остров сервер рисует отдельно, своим ключом гидратации (`renderId`): у
 * каждого острова в браузере свой `hydrate()` с тем же ключом.
 */

import { describe, it, expect } from 'vitest'
import type { JSX } from 'solid-js'
import { renderToStream, renderToString } from 'solid-js/web'
import {
	AccordionLayerStreamed,
	FieldControlStreamed,
	FieldGroup,
	FieldOwnId,
	IslandEntry,
	IslandProbe,
	ListBoxWithEmpty,
	PartProbe,
	RootProbe,
	RootProbeStreamed,
	TabsActiveFirst,
	TabsActiveSecond,
	TabsActiveStreamed,
	TabsStreamed,
	TagsSelectedSecond,
	TagsSelectedStreamed,
	type TStreamedPageProps,
} from './pages'

/** Страница и её фикстура — имя файла в `markup/`. */
const PAGES: ReadonlyArray<readonly [fixture: string, page: () => JSX.Element]> = [
	['tabs-active-second', () => <TabsActiveSecond />],
	['tabs-active-first', () => <TabsActiveFirst />],
	['tags-selected-second', () => <TagsSelectedSecond />],
	['root-probe', () => <RootProbe />],
	['part-probe', () => <PartProbe />],
	['field-own-id', () => <FieldOwnId />],
	['field-group', () => <FieldGroup />],
	['list-box-with-empty', () => <ListBoxWithEmpty />],
]

/** Страница с границей `Suspense`, которую сервер досылает потоком, и её фикстура. */
const STREAMED: ReadonlyArray<
	readonly [fixture: string, page: (props: TStreamedPageProps) => JSX.Element]
> = [
	['tabs-streamed', (props) => <TabsStreamed wait={props.wait} />],
	['tabs-active-streamed', (props) => <TabsActiveStreamed wait={props.wait} />],
	['tags-selected-streamed', (props) => <TagsSelectedStreamed wait={props.wait} />],
	['field-control-streamed', (props) => <FieldControlStreamed wait={props.wait} />],
	['root-probe-streamed', (props) => <RootProbeStreamed wait={props.wait} />],
	['accordion-layer-streamed', (props) => <AccordionLayerStreamed wait={props.wait} />],
]

/** Остров, его фикстура и ключ гидратации — тот же у `hydrate()` острова в браузере. */
const ISLANDS: ReadonlyArray<
	readonly [fixture: string, renderId: string, page: () => JSX.Element]
> = [
	['island-probe', 'a', () => <IslandProbe mark={() => 'served'} />],
	['island-entry', 'b', () => <IslandEntry enter={() => {}} />],
]

/**
 * Поток сервера целиком. Данные границы разрешаются, когда оболочка уже
 * записана: иначе граница успела бы в оболочку и досылать было бы нечего.
 */
function streamOf(page: (props: TStreamedPageProps) => JSX.Element): Promise<string> {
	let release = () => {}
	const wait = new Promise<void>((resolve) => (release = resolve))

	return new Promise((resolve) => {
		const chunks: string[] = []
		// `end` в типе `pipe` не объявлен, но в конце потока Solid его зовёт
		const writable = {
			write(chunk: string) {
				chunks.push(chunk)
				release()
			},
			end: () => resolve(chunks.join('')),
		}

		renderToStream(() => page({ wait })).pipe(writable)
	})
}

describe('разметка сервера для гидратации', () => {
	it.each(PAGES)('%s — фикстура совпадает с разметкой сервера', async (fixture, page) => {
		await expect(renderToString(page)).toMatchFileSnapshot(`./markup/${fixture}.html`)
	})

	it.each(STREAMED)('%s — фикстура совпадает с потоком сервера', async (fixture, page) => {
		await expect(await streamOf(page)).toMatchFileSnapshot(`./markup/${fixture}.html`)
	})

	it.each(ISLANDS)(
		'%s — фикстура совпадает с разметкой острова',
		async (fixture, renderId, page) => {
			await expect(renderToString(page, { renderId })).toMatchFileSnapshot(
				`./markup/${fixture}.html`,
			)
		},
	)
})
