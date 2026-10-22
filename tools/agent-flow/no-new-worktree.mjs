/**
 * Хук PreToolUse: агент не заводит новых worktree. Набор папок постоянный —
 * пул `/drive` (`soldy-<буква>`) и `soldy-conflicts` для конфликтов в PR
 * (AGENTS.md, «Рабочие папки»); новые папки заводит только владелец, руками.
 *
 * Без запрета каждая сессия, которой нужна чужая ветка, делала себе папку,
 * а `/drive` потом брал её в пул.
 *
 * Ловит `git worktree add` в Bash, `EnterWorktree` и `Agent` с изоляцией
 * `worktree`. Код 2 отказывает вызову, stderr уходит агенту.
 */

// `git` — в начале команды: в начале строки или после `;`, `&`, `|`, `(`.
// Иначе ловилось бы и упоминание в тексте — в сообщении коммита, в echo.
const WORKTREE_ADD = /(?:^|[;&|(])\s*git\b[^;&|\n]*\bworktree\s+add\b/m

async function readStdin() {
	let data = ''

	for await (const chunk of process.stdin) {
		data += chunk
	}

	return data
}

const { tool_name: tool, tool_input: input = {} } = JSON.parse(await readStdin())

const creates =
	(tool === 'Bash' && WORKTREE_ADD.test(input.command ?? '')) ||
	tool === 'EnterWorktree' ||
	(tool === 'Agent' && input.isolation === 'worktree')

if (creates) {
	process.stderr.write(
		'Новые worktree агентам не заводят (AGENTS.md, «Рабочие папки»). ' +
			'Конфликт в PR — в папке soldy-conflicts, задача — в папке пула через /drive. ' +
			'Нужна ещё папка — скажи владельцу.\n',
	)
	process.exit(2)
}
