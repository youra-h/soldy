import type { SetupContext } from 'vue'
import type { IPluginBundle } from '@soldy/plugins'
import { TInstancePlugin } from '@soldy/plugins'
import { useInstance } from './useInstance'
import { useBundle } from './useBundle'
import { useElementBinding } from './useElementBinding'

/**
 * Контекст, передаваемый в {@link IComponentSetupConfig.sync}.
 * Содержит всё необходимое для привязки core-инстанса к Vue-реактивности.
 */
export interface ISetupContext {
	/** Входные props компонента (реактивные) */
	props: Record<string, any>
	/** Экземпляр core-класса (raw, не реактивный) */
	instance: any
	/** Бандл плагинов */
	plugins: IPluginBundle
	/** Vue-функция emit для проброса событий */
	emit: SetupContext['emit']
}

/**
 * Конфигурация для {@link useComponentSetup}.
 *
 * @typeParam TCtor - Тип конструктора core-класса (TButton, TIcon, TTabs и т.д.)
 */
export interface IComponentSetupConfig<TCtor extends new (...args: any[]) => any> {
	/**
	 * Конструктор core-класса.
	 * Будет вызван с переданными props: `new Ctor({ props })`.
	 * Если в props передан `ctrl` — используется он вместо создания нового экземпляра.
	 */
	Ctor: TCtor

	/**
	 * Фабрика бандла плагинов.
	 * Вызывается внутри setup для создания/получения набора плагинов.
	 *
	 * @example
	 * plugins: createComponentViewBundle
	 */
	plugins: () => IPluginBundle

	/**
	 * Функция синхронизации core-инстанса с Vue-реактивностью.
	 * Получает {@link ISetupContext} и должна:
	 * - подписаться на события core-инстанса (`instance.events.on(...)`)
	 * - эмитить Vue-события через `ctx.emit?.('change:...', value)`
	 * - отслеживать изменения props через `watch`
	 * - вернуть объект с реактивными свойствами для шаблона
	 *
	 * @returns Объект реактивных свойств, которые попадут в шаблон.
	 *
	 * @example
	 * sync: (ctx) => {
	 *     const { tag, rendered, visible, classes } = syncComponentView(ctx)
	 *     return { tag, rendered, visible, classes }
	 * }
	 */
	sync: (ctx: ISetupContext) => Record<string, any>
}

/**
 * Создаёт setup-функцию для Vue Options API.
 * Автоматизирует рутинную инициализацию: создание instance, подключение плагинов,
 * привязку DOM-элемента. Разработчику остаётся только описать `Ctor`, `plugins` и `sync`.
 *
 * @returns Setup-функция, готовая для использования в `export default { setup: useComponentSetup({...}) }`.
 *
 * @example Базовое использование
 * ```ts
 * export default {
 *     name: '_ComponentView',
 *     extends: BaseComponentView,
 *     setup: useComponentSetup({
 *         Ctor: TComponentView,
 *         plugins: createComponentViewBundle,
 *         sync: (ctx) => syncComponentView(ctx),
 *     }),
 * }
 * ```
 *
 * @example Расширение: добавление своих свойств
 * ```ts
 * export default {
 *     name: '_MyButton',
 *     extends: BaseButton,
 *     setup(props, { emit }) {
 *         const base = useComponentSetup({
 *             Ctor: TButton,
 *             plugins: createComponentViewBundle,
 *             sync: (ctx) => syncButton(ctx),
 *         })(props, { emit })
 *
 *         return {
 *             ...base,
 *             myCustomProp: ref(42),
 *         }
 *     },
 * }
 * ```
 */
export function useComponentSetup<TCtor extends new (...args: any[]) => any>(
	config: IComponentSetupConfig<TCtor>,
): (props: Record<string, any>, ctx: SetupContext) => Record<string, any> {
	return function setup(props: Record<string, any>, { emit }: SetupContext) {
		const instance = useInstance(config.Ctor, props)

		const plugins = useBundle(config.plugins, props?.plugins)
		// Устанавливаем core-инстанс в плагин TInstancePlugin, чтобы плагины могли его использовать
		plugins.get(TInstancePlugin)!.instance = instance

		const rootElement = useElementBinding(plugins)

		const ctx: ISetupContext = { props, instance, plugins, emit }
		const state = config.sync(ctx)

		return { ctrl: instance, plugins, rootElement, ...state }
	}
}
