/**
 * Состояние двух контекстов одного компонента — одним видом.
 *
 * У коллекции контекстов два: свой и фасада (`useAdapter` и
 * `useCollectionAdapter`), и разметка читает свойства обоих одним объектом —
 * как React, который сливает их спредом `{ ...owner.state, ...facade.state }`
 * на каждом рендере. В Solid спред не годится: тело компонента выполняется
 * один раз, и спред прочёл бы состояние при сборке — смены до разметки не
 * дошли бы. Поэтому вид читает свойство у стора его контекста на каждое
 * чтение, как `joinState` у Svelte: разметка следит за ним, как за своим.
 *
 * Геттерами по ключам, как у Svelte, вид не собрать: ключа со значением
 * `undefined` в сторе Solid нет вовсе — запись `undefined` его удаляет, — и
 * свойство, незаданное к сборке (`closable` таба, имя из `aria_label`), в вид
 * не попало бы. Поэтому вид — прокси: свойство берётся у верхнего (`above`),
 * если оно там есть, иначе у нижнего (`below`), как правый спред. Проверка
 * «есть ли» — тоже чтение стора, и появление свойства разметка увидит. Хотя
 * одноимённых у компонента и фасада быть не должно: имена пропсов фасада
 * префиксуются (`tab_closable`).
 */

/** Одноимённое свойство берётся из верхнего состояния. */
export type TJoinedState<TBelow extends object, TAbove extends object> = Omit<
	TBelow,
	keyof TAbove
> &
	TAbove

export function joinState<TBelow extends object, TAbove extends object>(
	below: TBelow,
	above: TAbove,
): TJoinedState<TBelow, TAbove> {
	const joined = new Proxy<object>(
		{},
		{
			get: (_target, key) =>
				Reflect.has(above, key) ? Reflect.get(above, key) : Reflect.get(below, key),
		},
	)

	// Граница между рантаймом и типом, как `toInstanceState` у состояния одного
	// контекста: прокси отдаёт каждое свойство обоих состояний, но связь по
	// именам TypeScript не видит
	return joined as TJoinedState<TBelow, TAbove>
}
