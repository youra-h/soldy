/**
 * Ожидание: подключение, пришедшее, пока подключается другой элемент, идёт
 * сразу после него, в порядке прихода. AGENTS.md (Web Components), «Ожидание».
 */

let depth = 0

const waiting: (() => void)[] = []

export function isConnecting(): boolean {
	return depth > 0
}

/** Подключение: пришедшее во время него ждёт конца внешнего подключения. */
export function connecting(run: () => void): void {
	depth += 1

	try {
		run()
	} finally {
		depth -= 1

		if (depth === 0) runAll(drain())
	}
}

export function wait(resume: () => void): void {
	waiting.push(resume)
}

function* drain(): Generator<() => void> {
	for (let next = waiting.shift(); next; next = waiting.shift()) yield next
}

/** Выполнить всё: упавшая задача остальных не держит, первая ошибка уходит дальше. */
export function runAll(tasks: Iterable<() => void>): void {
	let failed = false
	let failure: unknown

	for (const task of tasks) {
		try {
			task()
		} catch (error) {
			if (!failed) {
				failed = true
				failure = error
			}
		}
	}

	if (failed) throw failure
}
