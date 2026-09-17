/**
 * Реестр плагинов, поставленных снаружи на все компоненты одного типа.
 *
 *   usePlugins(TButton, [TTimerPlugin])                    // кнопки пользователя
 *   usePlugins(TButton, [TRipplePlugin], { scope: 'all' }) // и вложенные тоже
 *
 * Кому достаётся регистрация — тип, `scope` и признак `embedded`, — решает
 * общий список регистраций (`registrations.ts`).
 *
 * Плагины регистрации ставятся после плагинов дескриптора, в порядке
 * регистрации, до `bundle:create` (`assemble/bundle.ts`). Внешний плагин
 * только добавляет — заменить плагин из состава компонента он не может.
 *
 * Контракт компонента реестр не меняет: пропсов и событий наружу у внешнего
 * плагина нет, их объявляет только дескриптор. Настраивается такой плагин
 * опциями регистрации, а разговаривают с ним через его API — из
 * `bundle:create` или по ссылке, которую он сам о себе оставил.
 */

import type { IPluginConstructor } from '@soldy/plugins'
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
		plugins.map((plugin) => ('ctor' in plugin ? plugin : { ctor: plugin })),
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
