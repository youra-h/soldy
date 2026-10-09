/**
 * TName — квалифицированное имя пропа или события: сырое имя и необязательный неймспейс плагина.
 *
 * - `name` — так к свойству и событию обращаются у владельца (`owner[name]`,
 *   `events.on(name)`);
 * - `namespace` — чей это проп: у плагина он есть, у компонента нет;
 * - `getName()` — полное имя (`aria:label`), уникальное в составе компонента.
 *
 * Имя во фреймворке из него строит стратегия адаптера (`INamingStrategy`).
 *
 * Полное имя склеивается один раз, в конструкторе. Имя создаётся на объявление
 * и живёт, пока жив тип, а полное имя читают на каждом монтировании: по нему
 * обмен раскладывает события по участникам.
 */
export class TName {
	private readonly _fullName: string

	constructor(
		readonly name: string,
		readonly namespace?: string,
	) {
		this._fullName = namespace ? `${namespace}:${name}` : name
		Object.freeze(this)
	}

	getName(): string {
		return this._fullName
	}
}
