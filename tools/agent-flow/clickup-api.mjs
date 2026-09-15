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

	// Личный токен ClickUp всегда начинается с pk_. Если пришло что-то другое —
	// это почти всегда неподставленный ${CLICKUP_TOKEN} или плейсхолдер из
	// settings.local.json. Без этой проверки ошибка выглядит как невнятный 401.
	if (!token.startsWith('pk_')) {
		throw new Error(
			`CLICKUP_TOKEN выглядит неправильно: "${token.slice(0, 20)}". Ожидается личный токен, начинающийся с pk_.`,
		)
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
 * Приоритеты ClickUp в том порядке, в каком роли берут задачи. В API
 * приоритет — число от 1 (urgent) до 4 (low): позиция в списке плюс один.
 */
export const PRIORITIES = ['urgent', 'high', 'normal', 'low']

/** Приоритета нет — задача стоит как normal, так же как задача без тега размера. */
function priorityRank(task) {
	const rank = PRIORITIES.indexOf(task.priority?.priority)

	return rank === -1 ? PRIORITIES.indexOf('normal') : rank
}

/** Порядок очереди: сначала важные, внутри одного приоритета — от старых к новым. */
export const queueOrder = (a, b) =>
	priorityRank(a) - priorityRank(b) || Number(a.date_created) - Number(b.date_created)

/**
 * Задачи в заданном статусе.
 *
 * Если в конфиге указан spaceId — ищем по всему Space: тогда новые списки
 * внутри проекта подхватываются сами, без правки конфига. Иначе работаем по
 * одному списку.
 */
export async function tasksByStatus(status) {
	const filter = `statuses%5B%5D=${encodeURIComponent(status)}&subtasks=true`

	const { tasks = [] } = config.spaceId
		? await api(
				`/team/${requireConfig('teamId')}/task?space_ids%5B%5D=${config.spaceId}&${filter}`,
			)
		: await api(`/list/${requireConfig('listId')}/task?${filter}`)

	// Роль без явного ID берёт первую свободную задачу из очереди, и без
	// сортировки «первая» означала бы «как сегодня отдал ClickUp».
	return tasks.sort(queueOrder)
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
