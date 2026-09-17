/**
 * Реестр плагинов, поставленных снаружи на все компоненты одного типа.
 *
 *   usePlugins(TButton, [TTimerPlugin])                    // кнопки пользователя
 *   usePlugins(TButton, [TRipplePlugin], { scope: 'all' }) // и вложенные тоже
 *
 * Тип компонента — класс ядра, сравнение через `instanceof`: объект дескриптора
 * строится заново на каждом монтировании, а класс один. `instanceof` берёт и
 * наследника, переданного через `ctrl`.
 *
 * Вложенный компонент — деталь реализации чужой разметки (строка и крестик
 * тега). Разметка библиотеки помечает его признаком `embedded` с именем места,
 * и `scope: 'own'` (по умолчанию) его пропускает.
 *
 * Плагины регистрации ставятся после плагинов дескриптора, в порядке
 * регистрации, до `bundle:create`. Регистрация действует на компоненты, чей
 * набор собирается после неё: уже смонтированные не меняются. Внешний плагин
 * только добавляет — заменить плагин из состава компонента он не может.
 */

import type { IPluginConstructor } from '@soldy/plugins'

/** Какие компоненты типа получают плагин. */
export type TPluginScope = 'own' | 'all'

export interface IPluginRegistrationOptions {
	/**
	 * `'own'` — только компоненты, которые поставил пользователь; `'all'` — и
	 * вложенные в разметку других компонентов.
	 */
	scope?: TPluginScope
}

/** Плагин регистрации: класс или класс с опциями установки. */
export type TRegisteredPlugin =
	| IPluginConstructor<any, any, any>
	| { readonly ctor: IPluginConstructor<any, any, any>; readonly options?: object }

/** Контекст сборки набора: что знает о компоненте тот, кто его собирает. */
export interface IBundleContext {
	/** Имя места во вложенной разметке; нет — компонент поставил пользователь. */
	embedded?: string
}

/** Плагин, который компонент получает из реестра. */
export interface IResolvedPlugin {
	readonly ctor: IPluginConstructor<any, any, any>
	readonly options?: object
}

interface IRegistration {
	readonly type: abstract new (...args: any[]) => object
	readonly plugins: readonly IResolvedPlugin[]
	readonly scope: TPluginScope
}

const registrations: IRegistration[] = []

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
	const registration: IRegistration = {
		type,
		plugins: plugins.map((plugin) => ('ctor' in plugin ? plugin : { ctor: plugin })),
		scope: options.scope ?? 'own',
	}

	registrations.push(registration)

	return () => {
		const index = registrations.indexOf(registration)

		if (index !== -1) registrations.splice(index, 1)
	}
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

	for (const { type, plugins, scope } of registrations) {
		if (!(instance instanceof type)) continue
		if (scope === 'own' && context.embedded !== undefined) continue

		for (const plugin of plugins) {
			resolved.delete(plugin.ctor)
			resolved.set(plugin.ctor, plugin)
		}
	}

	return [...resolved.values()]
}
