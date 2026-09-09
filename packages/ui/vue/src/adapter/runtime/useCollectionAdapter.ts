import type { IAdapterContext } from '@soldy/setup'
import { useAdapter, type TExtractControllerState, type TUnwrapRefs } from './useAdapter'

/**
 * То же, что `TBinding`, но без `ctrl` и `rootElement`.
 *
 * Оба параметра настоящие: `TProps` — контракт коллекционных пропов компонента
 * (`IListBoxCollectionProps` и его соседи), `TInstance` — фасад. Из них шаблон
 * и получает типы `items`, `list_aria` и прочего, что отдаёт коллекция.
 *
 * Собрано пересечением, а не через `Omit<TBinding, …>`: `Omit` схлопывает
 * пересечение в плоский тип, и `items` из объявленного пропа перестаёт
 * совмещаться с `items` фасада — шаблон видит union, у которого нет `uid`.
 */
export type TCollectionBinding<TProps, TInstance> = { plugins: any } & TUnwrapRefs<TProps> &
	TExtractControllerState<TInstance>

/**
 * Адаптер фасада коллекции — всё то же, кроме того, что принадлежит компоненту.
 *
 * У коллекционного компонента адаптеров два: свой и фасада. Оба проходят через
 * `useAdapter`, и оба кладут в результат `ctrl` и `rootElement` — а это имена
 * компонента, не фасада:
 *
 * - `ctrl` у фасада это `T*CollectionFacade`, тогда как снаружи под этим именем
 *   ждут сам компонент;
 * - `rootElement` у фасада своего нет вовсе — он появляется только при
 *   подключённом `TPluginsBindingExtension`, а коллекционный контекст
 *   создаётся с `defaultExtensions: []`.
 *
 * `plugins` остаётся: у обоих адаптеров это **один и тот же** bundle — второй
 * контекст создаётся с `{ bundle: adapter.bundle }`, — так что перекрытие
 * ничего не меняет.
 *
 * Пока спорные ключи отдавались, корректность держалась на **порядке спредов**
 * в `setup`, и порядок этот ничем не проверялся. Восемь компонентов сливают по
 * два адаптера; три owner'а порядок перепутали, а заметил это только Select —
 * единственный, чей шаблон читает `ctrl` (`ctrl.toggleOpen()`), и потому
 * сломался видимо. Его починили перестановкой, у него одного. Убрать лишние
 * ключи в источнике надёжнее, чем помнить про порядок в каждом новом
 * коллекционном компоненте.
 */
export function useCollectionAdapter<TProps extends object, TInstance = any>(
	adapter: IAdapterContext,
	props: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
): TCollectionBinding<TProps, TInstance> {
	// Через rest-деструктуризацию: перечислять остающиеся ключи нельзя — это
	// рефы фасада, и у каждой коллекции они свои
	const { ctrl: _ctrl, rootElement: _rootElement, ...refs } = useAdapter(adapter, props, emit)

	// Приведение: какие два ключа сняты, известно нам, но через дженерик
	// rest-деструктуризации TypeScript этого не доказывает
	return refs as TCollectionBinding<TProps, TInstance>
}
