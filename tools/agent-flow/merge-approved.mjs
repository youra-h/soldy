#!/usr/bin/env node
/**
 * Мерж одобренных задач. Без LLM — обычный скрипт, нулевая стоимость.
 *
 * Что делает: находит задачи в статусе APPROVED, ищет для каждой открытый PR по
 * ID задачи в имени ветки, мержит его и переводит задачу в CLOSED.
 *
 *   node tools/agent-flow/merge-approved.mjs          # только показать, что будет сделано
 *   node tools/agent-flow/merge-approved.mjs --yes    # выполнить
 *
 * По умолчанию это dry-run: мерж в main необратим, и запускать его случайным
 * двойным Enter'ом не стоит.
 */

import { execFileSync } from 'node:child_process'
import { addComment, config, setStatus, tasksByStatus } from './clickup-api.mjs'

const APPLY = process.argv.includes('--yes')

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' })

function openPullRequests() {
	return JSON.parse(gh('pr', 'list', '--state', 'open', '--json', 'number,headRefName,url,title'))
}

/** ClickUp связывает PR с задачей по ID в имени ветки — ищем так же. */
function findPullRequest(pullRequests, task) {
	const keys = [task.id, task.custom_id].filter(Boolean).map((key) => key.toLowerCase())

	return pullRequests.find((pr) => keys.some((key) => pr.headRefName.toLowerCase().includes(key)))
}

async function main() {
	const tasks = await tasksByStatus(config.statuses.approved)

	if (tasks.length === 0) {
		console.log('Задач в APPROVED нет.')

		return
	}

	const pullRequests = openPullRequests()

	for (const task of tasks) {
		const label = `${task.custom_id ?? task.id} "${task.name}"`
		const pr = findPullRequest(pullRequests, task)

		if (!pr) {
			console.log(`⚠  ${label}: открытый PR не найден — пропускаю.`)
			continue
		}

		if (!APPLY) {
			console.log(
				`→  ${label}: смержил бы PR #${pr.number} (${pr.headRefName}) и закрыл задачу.`,
			)
			continue
		}

		try {
			gh('pr', 'merge', String(pr.number), '--squash', '--delete-branch')
		} catch (error) {
			// Чаще всего это красный CI или конфликт: задачу оставляем в APPROVED.
			console.log(
				`✗  ${label}: PR #${pr.number} не смержился — ${String(error.message).trim()}`,
			)
			continue
		}

		await addComment(task.id, `#MERGE\n\nPR #${pr.number} смержен в main: ${pr.url}`)
		await setStatus(task.id, config.statuses.closed)

		console.log(`✓  ${label}: PR #${pr.number} смержен, задача закрыта.`)
	}
}

main().catch((error) => {
	console.error(String(error.message ?? error))
	process.exit(1)
})
