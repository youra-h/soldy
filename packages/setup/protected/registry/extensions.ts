/**
 * Реестр расширений коллекции, поставленных снаружи на все компоненты типа.
 *
 *   useExtensions(TTabs, [(owner) => new TTabsHistoryExtension({ owner })])
 *
 * Пара к `usePlugins`: тип — класс ядра владельца коллекции, кому достаётся
 * регистрация, решает тот же список регистраций. Регистрируется фабрика, а не
 * экземпляр: у каждого движка своё расширение. Фабрика получает владельца —
 * как `TOwnerExtensionSet` в сборке коллекции ядра.
 *
 * Ставит расширения слой setup (`TCollectionExtension`), когда движок привязан
 * к компоненту: движок и ядро о реестре не знают (AGENTS.md, «Движок не знает о
 * конкретных расширениях»). Расширение только добавляет: имя, занятое
 * расширением другого класса, — ошибка; то же расширение в том же движке
 * (движок передан двум компонентам) второй раз не ставится.
 */

import type { TCollectionEngine } from '@soldy-ui/core'
import type { IBundleContext } from '../define'
import { createRegistrations } from './registrations'
import type { IPluginRegistrationOptions, TExtensionFactory } from './types'

const registrations = createRegistrations<TExtensionFactory>()

/**
 * Поставить расширения в движок каждого компонента типа. Возвращает отмену
 * регистрации; уже поставленные расширения отмена не трогает.
 */
export function useExtensions<TOwner extends object>(
	type: abstract new (...args: any[]) => TOwner,
	factories: readonly TExtensionFactory<TOwner>[],
	options: IPluginRegistrationOptions = {},
): () => void {
	return registrations.add(type, factories, options)
}

/**
 * Поставить в движок расширения реестра, подходящие владельцу, в порядке
 * регистрации. Зовёт setup при привязке движка к компоненту.
 */
export function applyRegisteredExtensions(
	owner: object,
	engine: TCollectionEngine<any, any>,
	context: IBundleContext = {},
): void {
	for (const factory of registrations.select(owner, context)) {
		const extension = factory(owner)
		const present: unknown = engine.extensions[extension.name]

		if (present === undefined) {
			engine.use(extension)
			continue
		}

		// Движок, переданный двум компонентам, получает расширение один раз
		if (present instanceof Object && present.constructor === extension.constructor) continue

		throw new Error(
			`Расширение «${extension.name}» уже есть в коллекции ${owner.constructor.name}: расширение реестра только добавляет`,
		)
	}
}
