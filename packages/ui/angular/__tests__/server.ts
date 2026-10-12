/**
 * Сервер и браузер в одном процессе спека: серверный рендер Angular и
 * гидратация его разметки — для `*.server.spec.ts`.
 *
 * Сервер — `renderApplication` из `@angular/platform-server`, как в
 * приложении: своя платформа сервера на каждый рендер, DOM — эмуляция Angular
 * (domino), а не jsdom спека. Браузер — `bootstrapApplication` с
 * `provideClientHydration` над разметкой сервера в документе jsdom.
 *
 * Сервер и браузер делят один процесс, а платформа сервера рассчитана на
 * процесс сервера и оставляет в нём два следа:
 *
 * - классы DOM эмуляции (`Element`, `HTMLElement`, `Event` …) — в
 *   `globalThis`, поверх классов jsdom. С ними `instanceof Element` у узлов
 *   jsdom ложь — у плагинов и у проверок спека. Поэтому `renderOnServer`
 *   возвращает глобальные значения, какими они были до рендера, — когда
 *   закончился последний из идущих параллельно: пока идёт хоть один, классы
 *   эмуляции нужны ему;
 * - документ сервера — у ядра Angular: его берёт и гидратация браузера.
 *   Поэтому браузер — не платформа TestBed, а свежая платформа браузера, как
 *   у загруженной страницы: `hydrate` снимает текущую платформу
 *   (`destroyPlatform`), и `bootstrapApplication` заводит свою, со своим
 *   документом. TestBed в файле с гидратацией больше не работает, и такие
 *   файлы его не зовут.
 *
 * Чтобы следы не достались другим файлам того же воркера, файлы спеков
 * изолированы (`isolate` цели `test` в `angular.json`).
 */

import {
	destroyPlatform,
	provideZonelessChangeDetection,
	reflectComponentType,
	type ApplicationRef,
	type EnvironmentProviders,
	type Provider,
	type Type,
} from '@angular/core'
import {
	bootstrapApplication,
	provideClientHydration,
	type BootstrapContext,
} from '@angular/platform-browser'
import { provideServerRendering, renderApplication } from '@angular/platform-server'

/**
 * Провайдеры приложения, общие для сервера и браузера, — `appConfig`:
 * гидратация и режим без Zone.js, в котором работает адаптер.
 *
 * Функция, а не список, собранный при загрузке модуля: состав провайдеров
 * гидратации зависит от того, где их собирают, — сервер они узнают по флагу,
 * который ставит его платформа (у приложения его ставит сборка серверного
 * бандла). Собранные в браузере, на сервере они запускали бы повтор событий
 * браузера.
 */
function appProviders(): EnvironmentProviders[] {
	return [provideClientHydration(), provideZonelessChangeDetection()]
}

/** Страница сервера: в `body` — только корень приложения, по его селектору. */
function pageOf(app: Type<unknown>): string {
	const selector = reflectComponentType(app)?.selector

	if (!selector) throw new Error('Корню приложения нужен селектор элемента')

	return `<html><head></head><body><${selector}></${selector}></body></html>`
}

/**
 * Возвращает глобальные значения, какими они были при вызове: имена, которых
 * не было, снимаются, а сменившиеся значения пишутся обратно. Пишутся
 * присваиванием, а не дескриптором: jsdom держит свои классы в `globalThis`
 * аксессорами, и запись эмуляции ушла в их сеттер.
 */
function keepGlobals(): () => void {
	const names = new Set(Reflect.ownKeys(globalThis))
	const values = new Map<PropertyKey, unknown>()

	for (const name of names) {
		// Геттер, который бросает при чтении, эмуляция не трогает
		try {
			values.set(name, Reflect.get(globalThis, name))
		} catch {
			continue
		}
	}

	return () => {
		for (const name of Reflect.ownKeys(globalThis)) {
			// Имя завела эмуляция
			if (!names.has(name)) {
				Reflect.deleteProperty(globalThis, name)
				continue
			}

			if (!values.has(name)) continue

			const value = values.get(name)

			if (!Object.is(Reflect.get(globalThis, name), value))
				Reflect.set(globalThis, name, value)
		}
	}
}

/** Серверные рендеры, которые идут сейчас: сервер рисует запросы параллельно. */
let rendering = 0

/** Вернуть глобальные значения, какими они были до первого из идущих рендеров. */
let restoreGlobals: () => void = () => {}

/**
 * Серверный рендер приложения `app`: вся страница, как её отдаёт сервер.
 * `providers` — свои у запроса, поверх провайдеров приложения: так спек
 * отдаёт странице данные запроса (язык страницы).
 */
export async function renderOnServer(
	app: Type<unknown>,
	providers: Provider[] = [],
): Promise<string> {
	if (rendering++ === 0) restoreGlobals = keepGlobals()

	try {
		return await renderApplication(
			(context: BootstrapContext) =>
				bootstrapApplication(
					app,
					{ providers: [provideServerRendering(), ...appProviders(), ...providers] },
					context,
				),
			{ document: pageOf(app) },
		)
	} finally {
		if (--rendering === 0) restoreGlobals()
	}
}

/** Содержимое `body` страницы сервера. */
function bodyOf(page: string): string {
	const body = /<body>([\s\S]*)<\/body>/.exec(page)

	if (!body) throw new Error('В разметке сервера нет body')

	return body[1]
}

/**
 * Страница сервера — в документ, как её получил бы браузер. Узлы сервера
 * спек берёт отсюда до гидратации, чтобы после неё сверить их с узлами
 * приложения.
 */
export function loadPage(page: string): void {
	document.body.innerHTML = bodyOf(page)
}

/**
 * Гидратация страницы, которую `loadPage` положил в документ, приложением
 * `app` на свежей платформе браузера (см. шапку).
 */
export function hydrate(app: Type<unknown>): Promise<ApplicationRef> {
	destroyPlatform()

	return bootstrapApplication(app, { providers: appProviders() })
}

/** После гидратации: снять платформу браузера вместе с приложением и очистить документ. */
export function leavePage(): void {
	destroyPlatform()
	document.body.innerHTML = ''
}
