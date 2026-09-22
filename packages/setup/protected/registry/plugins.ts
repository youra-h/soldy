/**
 * Реестр плагинов, поставленных снаружи на все компоненты одного типа.
 *
 *   usePlugins(TButton, [TTimerPlugin])                    // кнопки пользователя
 *   usePlugins(TButton, [TRipplePlugin], { scope: 'all' }) // и вложенные тоже
 *   usePlugins(TButton, [AnchorPluginDescriptor])          // определением — см. ниже
 *
 * Кому достаётся регистрация — тип, `scope` и признак `embedded`, — решает
 * общий список регистраций (`registrations.ts`).
 *
 * Плагины регистрации ставятся после плагинов дескриптора, в порядке
 * регистрации, до `bundle:create` (`TOwnBundle`). Внешний плагин
 * только добавляет — заменить плагин из состава компонента он не может.
 *
 * Поверхность компонента реестр не меняет. Пропсы и события внешнего плагина —
 * по его контракту (`definePlugin`), через `pluginProps` и `plugin:event`
 * (AGENTS.md, «Внешний плагин: пропсы — `pluginProps`, события — `plugin:event`»). Настраивается
 * он и опциями регистрации.
 *
 * **Плагин с объявленным контрактом ставьте определением, а не классом.**
 * Контракт записывает вызов `definePlugin` при импорте модуля определения, а
 * пакет объявлен `sideEffects: false`: модуль, из которого ничего не взяли,
 * сборщик выбрасывает — вместе с записью контракта. Поставленный по классу,
 * такой плагин работал бы, но `pluginProps` до него молча не доходили бы, и
 * только в продакшен-сборке. Импорт определения держит модуль в бандле.
 */

import type { IPluginConstructor } from '@soldy-ui/plugins'
import type { IBundleContext } from '../define'
import { createRegistrations } from './registrations'
import type { IPluginRegistrationOptions, IResolvedPlugin, TRegisteredPlugin } from './types'

const registrations = createRegistrations<IResolvedPlugin>()

/**
 * Поставить плагины на все компоненты типа. Возвращает отмену регистрации:
 * её зовут, когда плагины больше не нужны новым компонентам (модуль выгружен,
 * тест закончился). Уже собранные наборы отмена не трогает.
 */
export function usePlugins(
	type: abstract new (...args: any[]) => object,
	plugins: readonly TRegisteredPlugin[],
	options: IPluginRegistrationOptions = {},
): () => void {
	return registrations.add(
		type,
		// Из определения берутся только класс и опции: контракт остаётся свойством класса
		plugins.map((plugin) =>
			'ctor' in plugin ? { ctor: plugin.ctor, options: plugin.options } : { ctor: plugin },
		),
		options,
	)
}

/**
 * Плагины реестра для компонента, в порядке регистрации. Один класс плагина —
 * один раз: у повторной регистрации побеждают опции последней, как у
 * приложения, которое донастраивает плагин темы.
 */
export function resolveRegisteredPlugins(
	instance: object,
	context: IBundleContext = {},
): IResolvedPlugin[] {
	const resolved = new Map<IPluginConstructor<any, any, any>, IResolvedPlugin>()

	for (const plugin of registrations.select(instance, context)) {
		resolved.delete(plugin.ctor)
		resolved.set(plugin.ctor, plugin)
	}

	return [...resolved.values()]
}
