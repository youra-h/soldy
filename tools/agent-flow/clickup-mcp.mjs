#!/usr/bin/env node
/**
 * Минимальный MCP-сервер для ClickUp. Без зависимостей.
 *
 * Транспорт stdio у MCP — это JSON-RPC, по одному сообщению на строку.
 * stdout занят протоколом, поэтому любая диагностика идёт только в stderr.
 *
 * Запуск: CLICKUP_TOKEN=pk_... node tools/agent-flow/clickup-mcp.mjs
 */

import { api, config, requireConfig, tasksByStatus } from './clickup-api.mjs'

const log = (...args) => process.stderr.write(`[clickup-mcp] ${args.join(' ')}\n`)

/** Метка этапа в ленте комментариев. По ней видно, кто и на каком шаге писал. */
const HASHTAGS = {
	analyst: '#ANALYSIS',
	techlead: '#PLANNING',
	developer: '#DEV',
}

/**
 * Размер задачи владелец задаёт тегом в ClickUp. Тег может меняться между
 * этапами: крупный анализ, а следом простое планирование по готовой карте.
 *
 * Тега нет — значит normal. Если владелец повесил несколько, берём больший:
 * недооценить масштаб дороже, чем переоценить.
 */
const SIZES = ['simple', 'normal', 'hard']

function sizeOf(tags) {
	const found = tags.filter((tag) => SIZES.includes(tag))

	if (found.length === 0) return 'normal'

	return found.reduce((a, b) => (SIZES.indexOf(a) > SIZES.indexOf(b) ? a : b))
}

/* ─────────────────────────── Формат ответов ─────────────────────────── */

/**
 * Задача целиком — это сотни полей, из которых ролям нужны единицы.
 * Возвращаем только их: контекст агента дороже полноты ответа.
 */
function trimTask(task) {
	const tags = (task.tags ?? []).map((tag) => tag.name.toLowerCase())

	return {
		id: task.id,
		name: task.name,
		status: task.status?.status ?? null,
		size: sizeOf(tags),
		url: task.url,
		description: task.description || task.text_content || '',
		assignees: (task.assignees ?? []).map((user) => user.username),
		tags,
		parent: task.parent ?? null,
	}
}

function trimComment(comment) {
	return {
		id: comment.id,
		author: comment.user?.username ?? 'unknown',
		date: new Date(Number(comment.date)).toISOString(),
		text: comment.comment_text ?? '',
	}
}

/** ClickUp плохо переносит гигантские комментарии — режем по границе строк. */
function chunk(text, size) {
	if (text.length <= size) return [text]

	const parts = []
	let rest = text

	while (rest.length > size) {
		const cut = rest.lastIndexOf('\n', size)
		const at = cut > size * 0.5 ? cut : size
		parts.push(rest.slice(0, at))
		rest = rest.slice(at)
	}

	parts.push(rest)

	return parts.map((part, index) => `${part}\n\n_(часть ${index + 1}/${parts.length})_`)
}

/* ─────────────────────────── Инструменты ─────────────────────────── */

const tools = {
	clickup_get_task: {
		description:
			'Прочитать задачу ClickUp: название, описание, статус, размер (size), исполнителей, теги. Возвращает урезанный набор полей.',
		schema: {
			type: 'object',
			properties: { task_id: { type: 'string', description: 'ID задачи ClickUp' } },
			required: ['task_id'],
		},
		async run({ task_id }) {
			return trimTask(await api(`/task/${task_id}`))
		},
	},

	clickup_get_comments: {
		description:
			'Прочитать все комментарии задачи в хронологическом порядке. Это лента решений предыдущих ролей — читай её до начала работы.',
		schema: {
			type: 'object',
			properties: { task_id: { type: 'string' } },
			required: ['task_id'],
		},
		async run({ task_id }) {
			const { comments = [] } = await api(`/task/${task_id}/comment`)

			// ClickUp отдаёт от новых к старым, роли удобнее читать сверху вниз.
			return comments.map(trimComment).reverse()
		},
	},

	clickup_add_comment: {
		description:
			'Добавить комментарий к задаче от имени своей роли. Хештег этапа сервер проставит сам — писать его в тексте не нужно. Длинный текст режется на части автоматически.',
		schema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				role: {
					type: 'string',
					enum: ['analyst', 'techlead', 'developer'],
					description: 'Твоя роль. Определяет хештег этапа.',
				},
				text: { type: 'string', description: 'Markdown-текст комментария, без хештега' },
			},
			required: ['task_id', 'role', 'text'],
		},
		async run({ task_id, role, text }) {
			const hashtag = HASHTAGS[role]

			if (!hashtag) {
				throw new Error(
					`Неизвестная роль "${role}". Ожидается: ${Object.keys(HASHTAGS).join(', ')}`,
				)
			}

			// Хештег ставим здесь, а не в промпте: на нём держится вся цепочка
			// этапов, и полагаться на то, что модель его не забудет, нельзя.
			const body = text.trimStart().startsWith(hashtag)
				? text.trimStart()
				: `${hashtag}\n\n${text}`
			const parts = chunk(body, config.commentChunkSize ?? 30000)

			for (const part of parts) {
				await api(`/task/${task_id}/comment`, {
					method: 'POST',
					body: JSON.stringify({ comment_text: part, notify_all: false }),
				})
			}

			return { posted: parts.length }
		},
	},

	clickup_handoff: {
		description:
			'Завершить свой этап: перевести задачу в OVERVIEW и назначить на владельца. Вызывай последним, ПОСЛЕ того как оставил комментарий.',
		schema: {
			type: 'object',
			properties: { task_id: { type: 'string' } },
			required: ['task_id'],
		},
		async run({ task_id }) {
			const owner = Number(requireConfig('ownerId'))

			await api(`/task/${task_id}`, {
				method: 'PUT',
				body: JSON.stringify({
					status: config.statuses.overview,
					assignees: { add: [owner] },
				}),
			})

			return { status: config.statuses.overview, assigned_to: owner }
		},
	},

	clickup_list_by_status: {
		description:
			'Найти задачи списка в заданном статусе. Нужен диспетчеру и для ручной проверки очереди.',
		schema: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					description: 'Например: ANALYSIS, PLANNING, IN PROGRESS',
				},
			},
			required: ['status'],
		},
		async run({ status }) {
			return (await tasksByStatus(status)).map(trimTask)
		},
	},

	clickup_create_task: {
		description:
			'Завести отдельную задачу на проблему, найденную попутно и не входящую в текущую. Новая задача ложится владельцу в OVERVIEW — в очередь ролей она сама не попадёт. Не заменяет отчёт: упомяни созданную задачу в своём комментарии.',
		schema: {
			type: 'object',
			properties: {
				source_task_id: {
					type: 'string',
					description: 'ID задачи, в которой ты нашёл проблему. Определяет список и даёт ссылку на источник.',
				},
				role: {
					type: 'string',
					enum: ['techlead', 'developer'],
					description: 'Твоя роль. Заводить задачи могут только тимлид и программист.',
				},
				name: {
					type: 'string',
					description: 'Заголовок: что именно не так. Одна строка, без «нужно доработать».',
				},
				description: {
					type: 'string',
					description:
						'Суть проблемы, где она живёт (пути к файлам) и почему не решается здесь. Владелец будет читать это без твоего контекста.',
				},
				size: {
					type: 'string',
					enum: SIZES,
					description: 'Необязательно. Твоя оценка; владелец может её изменить.',
				},
			},
			required: ['source_task_id', 'role', 'name', 'description'],
		},
		async run({ source_task_id, role, name, description, size }) {
			if (!['techlead', 'developer'].includes(role)) {
				throw new Error(`Роль "${role}" не может заводить задачи. Ожидается: techlead, developer.`)
			}

			if (size && !SIZES.includes(size)) {
				throw new Error(`Неизвестный размер "${size}". Ожидается: ${SIZES.join(', ')}`)
			}

			const source = await api(`/task/${source_task_id}`)
			// Списка в конфиге может не быть — работа идёт по Space. Берём тот же
			// список, где живёт исходная задача: побочная находка относится к тому
			// же проекту, и разносить их по разным спискам незачем.
			const listId = source.list?.id ?? config.listId

			if (!listId) {
				throw new Error(`Не удалось определить список задачи ${source_task_id}`)
			}

			const owner = Number(requireConfig('ownerId'))
			const origin = `\n\n---\n_Выделено из [${source.name}](${source.url}) на этапе ${HASHTAGS[role]}._`

			const created = await api(`/list/${listId}/task`, {
				method: 'POST',
				body: JSON.stringify({
					name,
					description: description + origin,
					// OVERVIEW, а не первый статус потока: задача должна дождаться
					// решения владельца, а не уехать в очередь ролей сама собой.
					status: config.statuses.overview,
					assignees: [owner],
					tags: size ? [size] : [],
					notify_all: false,
				}),
			})

			return { id: created.id, url: created.url, status: config.statuses.overview }
		},
	},
}

/* ─────────────────────────── MCP / JSON-RPC ─────────────────────────── */

function send(message) {
	process.stdout.write(`${JSON.stringify(message)}\n`)
}

function reply(id, result) {
	send({ jsonrpc: '2.0', id, result })
}

function replyError(id, message) {
	send({ jsonrpc: '2.0', id, error: { code: -32000, message } })
}

async function handle(message) {
	const { id, method, params } = message

	// Уведомления (без id) ответа не требуют.
	if (id === undefined) return

	switch (method) {
		case 'initialize':
			return reply(id, {
				protocolVersion: params?.protocolVersion ?? '2025-06-18',
				capabilities: { tools: {} },
				serverInfo: { name: 'clickup', version: '0.1.0' },
			})

		case 'ping':
			return reply(id, {})

		case 'tools/list':
			return reply(id, {
				tools: Object.entries(tools).map(([name, tool]) => ({
					name,
					description: tool.description,
					inputSchema: tool.schema,
				})),
			})

		case 'tools/call': {
			const tool = tools[params?.name]

			if (!tool) {
				return replyError(id, `Неизвестный инструмент: ${params?.name}`)
			}

			try {
				const result = await tool.run(params.arguments ?? {})

				return reply(id, {
					content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				})
			} catch (error) {
				// Ошибку отдаём как результат с isError: агент должен её прочитать и решить сам.
				return reply(id, {
					content: [{ type: 'text', text: String(error.message ?? error) }],
					isError: true,
				})
			}
		}

		default:
			return replyError(id, `Метод не поддерживается: ${method}`)
	}
}

let buffer = ''

/**
 * Запросы обрабатываются строго по очереди.
 *
 * Без этого вызовы выполняются параллельно, и порядок ломается: если модель
 * отправит `add_comment` и `handoff` одним пакетом, задача уедет владельцу
 * раньше, чем появится комментарий. Протокол не по порядку разрешает, наш
 * протокол ролей — нет.
 */
let queue = Promise.resolve()

const enqueue = (message) => {
	queue = queue
		.then(() => handle(message))
		.catch((error) => log('ошибка обработки:', String(error)))
}

process.stdin.setEncoding('utf8')

process.stdin.on('data', (piece) => {
	buffer += piece

	let newline

	while ((newline = buffer.indexOf('\n')) !== -1) {
		const line = buffer.slice(0, newline).trim()
		buffer = buffer.slice(newline + 1)

		if (!line) continue

		try {
			enqueue(JSON.parse(line))
		} catch (error) {
			log('битое сообщение:', String(error))
		}
	}
})

log('запущен')
