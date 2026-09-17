/**
 * Реестр расширений коллекции, поставленных снаружи на все компоненты типа.
 *
 *   useExtensions(TTabs, [(owner) => new TTabsHistoryExtension({ owner })])
 *
 * Пара к `usePlugins`: тип — класс ядра владельца коллекции, сравнение через
 * `instanceof`, `scope` и признак `embedded` — те же. Регистрируется фабрика, а
 * не экземпляр: у каждого движка своё расширение. Фабрика получает владельца —
 * как `TOwnerExtensionSet` в сборке коллекции ядра.
 *
 * Ставит расширения слой setup (`TCollectionExtension`), когда движок привязан
 * к компоненту: движок и ядро о реестре не знают (AGENTS.md, «Движок не знает о
 * конкретных расширениях»). Расширение только добавляет: имя, занятое
 * расширением другого класса, — ошибка; то же расширение в том же движке
 * (движок передан двум компонентам) второй раз не ставится.
 */

import type { IExtension, TCollectionEngine } from '@soldy/core'
import type { IBundleContext, TPluginScope, IPluginRegistrationOptions } from './plugin-registry'

/** Фабрика расширения: владелец коллекции → расширение для его движка. */
export type TExtensionFactory<TOwner extends object = any> = (owner: TOwner) => IExtension<any>

interface IExtensionRegistration {
	readonly type: abstract new (...args: any[]) => object
	readonly factories: readonly TExtensionFactory[]
	readonly scope: TPluginScope
}

const registrations: IExtensionRegistration[] = []

/**
 * Поставить расширения в движок каждого компонента типа. Возвращает отмену
 * регистрации; уже поставленные расширения отмена не трогает.
 */
export function useExtensions<TOwner extends object>(
	type: abstract new (...args: any[]) => TOwner,
	factories: readonly TExtensionFactory<TOwner>[],
	options: IPluginRegistrationOptions = {},
): () => void {
	const registration: IExtensionRegistration = {
		type,
		factories,
		scope: options.scope ?? 'own',
	}

	registrations.push(registration)

	return () => {
		const index = registrations.indexOf(registration)

		if (index !== -1) registrations.splice(index, 1)
	}
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
	for (const { type, factories, scope } of registrations) {
		if (!(owner instanceof type)) continue
		if (scope === 'own' && context.embedded !== undefined) continue

		for (const factory of factories) {
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
}
