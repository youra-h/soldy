// Создаем наш собственный брендированный тип для ядра
export type TPropType<T> = {
	readonly __type: T
	readonly ctor: any // Ссылка на JS-конструктор (Object, Array, String и т.д.)
}

/**
 * Scope слота, который ничего не передаёт внутрь.
 *
 * Именно `object`, а не `Record<string, never>`: адаптеры отличают слот без
 * scope по `keyof S extends never` (см. TSnippetSlots в ui/svelte). У
 * `Record<string, never>` есть индексная сигнатура, поэтому его `keyof` —
 * это `string`, и проверка ломается: сниппет начинает требовать аргумент.
 * У `object` же `keyof` пуст, как и у прежнего `{}`, но без его дыры,
 * пропускавшей `0` и `""`.
 */
export type TEmptySlotScope = object
