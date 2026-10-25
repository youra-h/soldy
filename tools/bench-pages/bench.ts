import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { TButton, TComponent, TEventEmitter } from '@soldy-ui/core'
import { enUS, ruRU } from '@soldy-ui/plugins'
import {
	COMPONENTS,
	isPreviewHostModule,
	previewProps,
	type IPreviewHandle,
	type IPreviewHost,
} from '@soldy-ui/playground-shared'
import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../../packages/playground/vue/browser/page.css'
import { SCENARIOS } from './scenarios'

/**
 * Страница замера (`window.bench`): хост превью фреймворка из `?fw=` ставит
 * страницу компонента — N его копий одним корнем (`TPreviewMount.count`), —
 * сценарий действует на неё, и страница снимается. Меряет прогонщик
 * (`run.mjs`) протоколом DevTools; здесь — только то, что делает приложение.
 *
 * Хосты — стенда разработчика (`packages/playground/vue/src/hosts/`): у всех
 * шести фреймворков одни превью с одними данными, и страницы разных
 * фреймворков сравнимы.
 */

useIcons(material)
useTheme(oren)

/**
 * Модули хостов — лениво, по папкам, как у оболочки стенда
 * (`packages/playground/vue/src/hosts/index.ts`): грузится только хост
 * фреймворка страницы, а у хостов свои программы типов, и glob не втягивает
 * их в программу стенда.
 */
const HOSTS = import.meta.glob('../../packages/playground/vue/src/hosts/*/index.ts')

const framework = new URLSearchParams(location.search).get('fw') ?? 'vue'
const load = HOSTS[`../../packages/playground/vue/src/hosts/${framework}/index.ts`]

if (!load) throw new Error(`[bench-pages] нет хоста «${framework}»`)

const module = await load()

if (!isPreviewHostModule(module)) throw new Error(`[bench-pages] хост «${framework}» не хост`)

const host: IPreviewHost = module.default
const stage = document.querySelector<HTMLElement>('#app')

if (!stage) throw new Error('[bench-pages] нет #app')

/**
 * Страницы — готовые компоненты, которые хост умеет нарисовать, в порядке
 * реестра. Слои наследования (группа `layers`) — не компоненты страницы, как
 * и на витрине стенда.
 */
const pages = COMPONENTS.filter(
	(entry) => entry.group !== 'layers' && host.previews.includes(entry.id),
).map((entry) => entry.id)

/** Смонтированное сейчас: корни страницы. */
let mounted: IPreviewHandle[] = []

/**
 * Подставная утечка — проверка самого замера: после монтирования страница
 * держит узлы кнопок, слушатель `document` на каждую и экземпляр ядра, как
 * компонент, который забыл отписаться. Замер, который её не увидел, — не
 * замер.
 */
const leaked: unknown[] = []

function frame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function frames(count = 2): Promise<void> {
	for (let index = 0; index < count; index++) await frame()
}

/** Узел под корень: у каждой страницы — свой, снимается вместе с ней. */
function place(): HTMLElement {
	const node = document.createElement('div')

	node.className = 'bench-page'
	stage?.appendChild(node)

	return node
}

/**
 * Страница компонента: N копий одним корнем. Служебные страницы: `all` —
 * каждый компонент по разу, своим корнем; `empty` — корень без компонентов,
 * шум самого замера; `leak` — кнопки с подставной утечкой. Отдаёт время
 * монтирования, мс: от вызова хоста до второго кадра, к которому плагины
 * получили узлы.
 */
async function mount(page: string, count: number): Promise<number> {
	if (mounted.length) throw new Error('[bench-pages] страница уже стоит')

	const start = performance.now()

	if (page === 'all') {
		mounted = pages.map((id) =>
			host.mount(place(), { component: id, props: previewProps(id), count: 1 }),
		)
	} else {
		const component = page === 'leak' || page === 'empty' ? 'button' : page
		const copies = page === 'empty' ? 0 : count

		mounted = [
			host.mount(place(), { component, props: previewProps(component), count: copies }),
		]
	}

	await frames()

	const time = performance.now() - start

	if (page === 'leak') {
		for (const node of stage?.querySelectorAll('.so-button') ?? []) {
			const listener = () => node.isConnected

			document.addEventListener('pointerdown', listener)
			leaked.push(node, listener, new TButton({ text: 'Утечка' }))
		}
	}

	return time
}

/** Снять страницу: корни и их узлы; ждать кадры, за которые уходят слои. */
async function unmount(): Promise<void> {
	for (const handle of mounted) handle.unmount()

	mounted = []

	for (const node of stage?.querySelectorAll('.bench-page') ?? []) node.remove()

	await frames()
}

/** Сценарий страницы: действия на её копиях. `all` — сценарии всех компонентов по очереди. */
async function scenario(page: string, act: number): Promise<number> {
	const ids = page === 'all' ? pages : [page === 'leak' ? 'button' : page]

	if (page === 'empty') return 0
	let done = 0

	for (const id of ids) {
		const run = SCENARIOS[id]

		if (!run) continue

		const roots = [...(stage?.querySelectorAll<HTMLElement>('.bench-page') ?? [])]
		const scope = page === 'all' ? roots[ids.indexOf(id)] : roots[0]

		if (scope) done += await run(scope, page === 'all' ? 1 : act)
	}

	return done
}

/** Язык страницы: туда и обратно, как переключатель языка приложения. */
async function locale(): Promise<void> {
	host.setLocale(ruRU)
	await frames(1)
	host.setLocale(enUS)
	await frames(1)
}

/** Сколько живых объектов класса — для `Runtime.queryObjects` прогонщика. */
const prototypes = { component: TComponent.prototype, emitter: TEventEmitter.prototype }

const bench = { framework, pages, mount, unmount, scenario, locale, frames, prototypes }

Object.assign(window, { bench })
