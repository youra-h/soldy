/** Тонкая обёртка над ClickUp REST. Общая для MCP-сервера и скриптов. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const API = 'https://api.clickup.com/api/v2'

export const config = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'))

export async function api(path, options = {}) {
	const token = process.env.CLICKUP_TOKEN

	if (!token) {
		throw new Error('CLICKUP_TOKEN не задан в окружении')
	}

	const response = await fetch(`${API}${path}`, {
		...options,
		headers: {
			Authorization: token,
			'Content-Type': 'application/json',
			...options.headers,
		},
	})

	const body = await response.text()

	if (!response.ok) {
		throw new Error(`ClickUp ${response.status} ${path}: ${body.slice(0, 500)}`)
	}

	return body ? JSON.parse(body) : {}
}

export function requireConfig(field) {
	const value = config[field]

	if (!value) {
		throw new Error(`config.json: поле "${field}" не заполнено`)
	}

	return value
}

/**
 * Задачи в заданном статусе.
 *
 * Если в конфиге указан spaceId — ищем по всему Space: тогда новые списки
 * внутри проекта подхватываются сами, без правки конфига. Иначе работаем по
 * одному списку.
 */
export async function tasksByStatus(status) {
	const filter = `statuses%5B%5D=${encodeURIComponent(status)}&subtasks=true`

	if (config.spaceId) {
		const teamId = requireConfig('teamId')
		const { tasks = [] } = await api(
			`/team/${teamId}/task?space_ids%5B%5D=${config.spaceId}&${filter}`,
		)

		return tasks
	}

	const { tasks = [] } = await api(`/list/${requireConfig('listId')}/task?${filter}`)

	return tasks
}

export function setStatus(taskId, status) {
	return api(`/task/${taskId}`, { method: 'PUT', body: JSON.stringify({ status }) })
}

export function addComment(taskId, text) {
	return api(`/task/${taskId}/comment`, {
		method: 'POST',
		body: JSON.stringify({ comment_text: text, notify_all: false }),
	})
}
