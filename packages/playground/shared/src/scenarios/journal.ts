import type { IScenarioJournal, TJournalEntry } from './types'

/** Вывод строки в консоль: текст и аргументы как есть, чтобы их можно было раскрыть. */
export type TPrint = (line: string, ...args: unknown[]) => void

/** Консоль — канал стенда: человек смотрит туда, что пришло и с чем. */
export const printToConsole: TPrint = (line, ...args) => console.log(line, ...args)

/**
 * Журнал одного прогона.
 *
 * Новый на каждый запуск: перезапуск не должен считать события прежнего
 * прогона. Каждое событие сразу уходит в консоль с пометкой сценария —
 * блоки на странице идут вперемешку, и без неё не понять, чьё оно.
 */
export class TScenarioJournal implements IScenarioJournal {
	private readonly _entries: TJournalEntry[] = []

	constructor(
		private readonly _scope: string,
		private readonly _print: TPrint = printToConsole,
	) {}

	get entries(): readonly TJournalEntry[] {
		return this._entries
	}

	record(name: string, args: readonly unknown[]): void {
		this._entries.push({ name, args })
		this._print(`[${this._scope}] ${name}`, ...args)
	}

	count(name: string, from = 0): number {
		let count = 0

		for (let index = from; index < this._entries.length; index++) {
			if (this._entries[index].name === name) count++
		}

		return count
	}

	last(name: string): readonly unknown[] | undefined {
		for (let index = this._entries.length - 1; index >= 0; index--) {
			if (this._entries[index].name === name) return this._entries[index].args
		}

		return undefined
	}

	names(only: readonly string[], from = 0): string[] {
		return this._entries
			.slice(from)
			.map((entry) => entry.name)
			.filter((name) => only.includes(name))
	}
}
