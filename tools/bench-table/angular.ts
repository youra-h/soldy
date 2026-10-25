import {
	createComponent,
	type ComponentRef,
	type EnvironmentProviders,
	type Provider,
	type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { provideAttrs } from '@soldy-ui/angular'
import { participantName, q, startBench, type TSel } from './bench'
import type { TRec } from './libs/data'

/**
 * Страница Angular: таблица участника — корневой компонент приложения, строки
 * уходят ему входом `rows`, пустые — снятым компонентом, как у страницы Vue.
 * Приложение — без Zone.js, как у хоста Angular стенда разработчика: адаптер
 * рассчитан на zoneless. Рендерер адаптера (`provideAttrs()`) подключён, как в
 * `appConfig` приложения, рядом — провайдеры библиотеки участника, если они
 * ей нужны (тема PrimeNG, локаль NG-ZORRO).
 */
type TLib = {
	Bench: Type<unknown>
	sel: TSel
	providers?: (Provider | EnvironmentProviders)[]
}
const libs: Record<string, () => Promise<TLib>> = {
	soldy: () => import('./libs/angular/soldy'),
	plain: () => import('./libs/angular/plain'),
	tanstack: () => import('./libs/angular/tanstack'),
	material: () => import('./libs/angular/material'),
	aggrid: () => import('./libs/angular/aggrid'),
	prime: () => import('./libs/angular/prime'),
	zorro: () => import('./libs/angular/zorro'),
}
const { Bench, sel, providers = [] } = await libs[participantName()]()
const app = await createApplication({ providers: [provideAttrs(), ...providers] })
const host = q('#app')
let shown: ComponentRef<unknown> | null = null

function setRows(rows: TRec[] | null) {
	if (!rows) {
		shown?.destroy()
		shown = null
		return
	}

	if (!shown) {
		const element = host.appendChild(document.createElement('div'))

		shown = createComponent(Bench, {
			environmentInjector: app.injector,
			hostElement: element,
		})
		app.attachView(shown.hostView)
	}

	shown.setInput('rows', rows)
}

startBench({ sel, setRows })
