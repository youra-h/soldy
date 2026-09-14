import type { IExtension, IExtensionItems } from '../extension'

/**
 * Item-адаптер, который создаёт расширение, или `undefined`, если адаптеров оно
 * не создаёт, — ровно то, что вернёт `TItemContext.adapters` по его ключу.
 */
type TItemAdapterOf<TExtension> =
	TExtension extends IExtensionItems<any, infer TItemExt> ? TItemExt : undefined

/**
 * Автоматически выводит типы адаптеров для всех зарегистрированных расширений коллекции.
 * У расширения с методом createItem() в итоговом типе будет соответствующий адаптер,
 * у остальных — `undefined`.
 *
 * Тип гомоморфный, ключи не фильтруются через `as`. Фильтрующий ремаппинг
 * TypeScript на дженерике не раскрывает: базовый фасад элемента с
 * `TExtensions extends { order: … }` не видел `adapters.order` и приводил тип.
 * Гомоморфный тип над дженериком раскрывается по констрейнту набора.
 *
 * @example
 * ```ts
 * // TExtractItemAdapters<{ activation: TActivationExtension, plain: TPlainExtension }>
 * //   → { activation: IActivationItemExtension, plain: undefined }
 * ```
 */
export type TExtractItemAdapters<TExtensions extends Record<string, IExtension<any>>> = {
	[K in keyof TExtensions]: TItemAdapterOf<TExtensions[K]>
}
