/**
 * Состояние двух контекстов одним видом — прокси, которое читает свойство у
 * стора на каждое чтение: спред прочёл бы его один раз, в теле компонента, а
 * геттеры по ключам потеряли бы свойства, незаданные к сборке (запись
 * `undefined` удаляет ключ стора). Одноимённых у компонента и фасада нет —
 * имена фасада префиксуются.
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

	// Связь прокси с именами обоих состояний TypeScript не видит
	return joined as TJoinedState<TBelow, TAbove>
}
