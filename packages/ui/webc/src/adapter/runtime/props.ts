/**
 * Пропсы элемента между сборками. Связка новая на каждое подключение, а
 * пропсы — то, что задал потребитель атрибутом или свойством, в последнем
 * значении, какое видел элемент: перестановка не откатывает то, что с тех пор
 * поменяло ядро. Записанное без связки — до подключения, вне DOM или во время
 * сборки — ложится поверх. AGENTS.md (Web Components), «Пропсы между
 * сборками».
 */

/** Связка, какой её видит хранилище. */
export type TPropTarget = {
	readonly state: object
	syncProps(props: object): void
}

export class TPropStore {
	/** Последнее значение пропа: от потребителя или из ядра. */
	private readonly _values = new Map<string, unknown>()
	/** Пропы, которые задавал потребитель. */
	private readonly _given = new Set<string>()
	/** Записанное без связки. При живой связке пусто. */
	private _offline = new Map<string, unknown>()
	/** Снятое без связки до сборки: сборка `undefined` пропускает, снятие идёт следом. */
	private _unset = new Map<string, unknown>()

	isGiven(name: string): boolean {
		return this._given.has(name)
	}

	read(name: string, binding: TPropTarget | undefined): unknown {
		if (this._offline.has(name)) return this._offline.get(name)

		// Пропсы без триггеров (pluginProps) в состояние не попадают — их помнит элемент
		if (binding && Object.hasOwn(binding.state, name)) return Reflect.get(binding.state, name)

		return this._values.get(name)
	}

	write(name: string, value: unknown, binding: TPropTarget | undefined): void {
		this._given.add(name)

		if (!binding) {
			this._offline.set(name, value)

			return
		}

		if (!Object.hasOwn(binding.state, name)) this._values.set(name, value)

		binding.syncProps({ [name]: value })
	}

	/** Значение пришло из ядра. */
	remember(name: string, value: unknown): void {
		this._values.set(name, value)
	}

	/** Пропсы сборки: заданное потребителем, поверх — записанное без связки, и тег корня. */
	open(tag: string): Record<string, unknown> {
		const offline = this._offline
		const props: Record<string, unknown> = {}

		for (const name of this._given) props[name] = this._values.get(name)

		for (const [name, value] of offline) {
			if (value !== undefined) props[name] = value
		}

		props['tag'] = tag

		for (const [name, value] of offline) this._values.set(name, value)

		this._offline = new Map()
		this._unset = new Map([...offline].filter(([, value]) => value === undefined))

		return props
	}

	/**
	 * The assembly is over: what was unset before it, then what was written
	 * during it. Its place is this binding, not the next one: otherwise the next
	 * assembly would roll the component back to it.
	 */
	close(binding: TPropTarget): void {
		const late = this._unset

		for (const [name, value] of this._offline) late.set(name, value)

		this._offline = new Map()
		this._unset = new Map()

		for (const [name, value] of late) this.write(name, value, binding)
	}
}
