import type { IExtension, IExtensionItems } from '../extension'

/**
 * Автоматически выводит типы адаптеров для всех зарегистрированных расширений коллекции.
 * Если у расширения есть метод createItem(), в итоговом типе будет соответствующий адаптер.
 *
 * @example
 * ```ts
 * // TExtractItemAdapters<{ activation: TActivationExtension, plain: TPlainExtension }>
 * //   → { activation: IActivationItemExtension }
 * ```
 */
export type TExtractItemAdapters<TExtensions extends Record<string, IExtension<any>>> = {
	[K in keyof TExtensions as TExtensions[K] extends IExtensionItems<any, any>
		? K
		: never]: TExtensions[K] extends IExtensionItems<any, infer TItemExt> ? TItemExt : never
}
