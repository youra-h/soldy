/**
 * Хук UserPromptSubmit: команда роли с ID задачи (`/drive 869fjgrad`) называет
 * сессию названием задачи — его показывает вкладка чата. Параллельные `/drive`
 * иначе неотличимы: у всех вкладок заголовок — сама команда.
 *
 * Название, уже данное сессии (`/rename`, прошлый запуск), не перетирается.
 * Любой сбой — молча: заголовок не повод задерживать или ронять промпт.
 */

import { api } from './clickup-api.mjs'

const COMMAND = /^\s*\/?(?:drive|dev|plan|analyze|design|unlock)\s+([a-z0-9]+)\b/i

async function readStdin() {
	let data = ''

	for await (const chunk of process.stdin) {
		data += chunk
	}

	return data
}

try {
	const input = JSON.parse(await readStdin())
	const match = COMMAND.exec(input.prompt ?? '')

	if (match && !input.session_title) {
		const id = match[1]
		const task = await api(`/task/${id}`)

		process.stdout.write(
			JSON.stringify({
				hookSpecificOutput: {
					hookEventName: 'UserPromptSubmit',
					sessionTitle: `${task.name} · ${id}`,
				},
			}),
		)
	}
} catch {
	// заголовок не обязателен
}
