/**
 * TName — квалифицированное имя пропа или события: сырое имя и необязательный неймспейс плагина.
 *
 * - `name` — так к свойству и событию обращаются у владельца (`owner[name]`,
 *   `events.on(name)`);
 * - `namespace` — чей это проп: у плагина он есть, у компонента нет;
 * - `getName()` — полное имя (`aria:label`), уникальное в составе компонента.
 *
 * Имя во фреймворке из него строит стратегия адаптера (`INamingStrategy`).
 */
export class TName {
	constructor(
		readonly name: string,
		readonly namespace?: string,
	) {
		Object.freeze(this)
	}

	getName(): string {
		return this.namespace ? `${this.namespace}:${this.name}` : this.name
	}
}
