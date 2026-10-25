/**
 * PreToolUse hook: commit messages are written in English (AGENTS.md,
 * «Комментарии, коммиты и CHANGELOG — на английском»).
 *
 * Checked before the commit, not in CI: a task branch is never rewritten (no
 * rebase, amend or force-push), so a Russian commit pushed to a PR could not
 * be fixed any more.
 *
 * Catches `git commit` in Bash and looks for Cyrillic in the rest of the
 * command — the message given with `-m` or a heredoc. Exit code 2 rejects the
 * call, stderr goes to the agent.
 */

// `git` at the start of a command: at the start of a line or after `;`, `&`,
// `|`, `(`. Otherwise a mention in text — an echo, a message — would match.
const COMMIT = /(?:^|[;&|(])\s*git\b[^;&|\n]*\bcommit\b/m

const cyrillic = /[Ѐ-ӿ]/

async function readStdin() {
	let data = ''

	for await (const chunk of process.stdin) {
		data += chunk
	}

	return data
}

const { tool_name: tool, tool_input: input = {} } = JSON.parse(await readStdin())

const command = tool === 'Bash' ? (input.command ?? '') : ''
const commit = COMMIT.exec(command)

if (commit && cyrillic.test(command.slice(commit.index))) {
	process.stderr.write(
		'Commit messages are written in English (AGENTS.md, ' +
			'«Комментарии, коммиты и CHANGELOG — на английском»). Rewrite the message.\n',
	)
	process.exit(2)
}
