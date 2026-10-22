/**
 * TSvelteElevator — лифт одного ключа поверх контекста Svelte и слоя сборки.
 *
 * Наследует TElevator из @soldy-ui/setup: ключ лифта — символ, один на имя.
 *
 * Контекст Svelte — карта компонента: при первом обращении Svelte копирует в
 * неё карту ближайшего предка, `setContext` пишет в эту копию, а
 * `getContext` читает её же. Своё, опущенное по ключу, компонент поэтому
 * видит сам, а `up()` обещает значение предка в любом порядке, как `inject`
 * у Vue (docs/agents/collections.md, «Часть бывает сразу элементом и
 * владельцем коллекции того же типа»). Значение предка помнит слой сборки —
 * карта, которую лифтам отдаёт `useElevator()`:
 *
 * - `down(value)` перед первой своей записью ключа запоминает в слое то, что
 *   под ключом лежит, — значение предка, — и пишет своё `setContext`: его
 *   увидят дети;
 * - `up()` по уже опущенному ключу отдаёт запомненное, а по остальным —
 *   `getContext`: своего под ними нет, и это значение предка.
 *
 * Слой держит только опущенные ключи: снимок всей карты (`getAllContexts`)
 * копировал бы её на каждый элемент коллекции. Слой один на сборку: ключ
 * опускает одно расширение, а читает другое — у каждого свой лифт.
 *
 * Ограничение Svelte: `setContext` и `getContext` вызываются только во время
 * инициализации компонента — то же, что у `provide`/`inject` во Vue, —
 * поэтому расширения подключаются прямо в setup-слое.
 */

import { getContext, setContext } from 'svelte'
import { TElevator } from '@soldy-ui/setup'

export class TSvelteElevator<T = any> extends TElevator<T> {
	/**
	 * @param _inherited слой сборки — значения предка по ключам, которые она
	 *   опустила; один на все лифты фабрики `useElevator()`
	 */
	constructor(
		key: string | symbol,
		private readonly _inherited: Map<symbol, unknown>,
	) {
		super(key)
	}

	down(value: T): void {
		// Значение предка — до первой своей записи: после неё контекст отдаёт своё
		if (!this._inherited.has(this._key)) {
			this._inherited.set(this._key, getContext(this._key))
		}

		setContext(this._key, value)
	}

	up(): T | undefined {
		if (!this._inherited.has(this._key)) return getContext<T | undefined>(this._key)

		// Тип значения задаёт ключ лифта: под этим ключом кладут только `T`
		return this._inherited.get(this._key) as T | undefined
	}
}
