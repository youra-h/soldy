#!/usr/bin/env node
/**
 * Минимальный MCP-сервер для ClickUp. Без зависимостей.
 *
 * Транспорт stdio у MCP — это JSON-RPC, по одному сообщению на строку.
 * stdout занят протоколом, поэтому любая диагностика идёт только в stderr.
 *
 * Запуск: CLICKUP_TOKEN=pk_... node tools/agent-flow/clickup-mcp.mjs
 */

import { api, config, PRIORITIES, requireConfig, tasksByStatus } from './clickup-api.mjs'

const log = (...args) => process.stderr.write(`[clickup-mcp] ${args.join(' ')}\n`)

/**
 * Метка этапа в ленте комментариев. По ней видно, кто и на каком шаге писал.
 *
 * Менеджер пишет в ленту только при смене статуса — объясняет, почему задачу
 * переставили. Но и его комментарий обязан нести хештег: всё, что без хештега,
 * роли читают как слово владельца.
 */
const HASHTAGS = {
	analyst: '#ANALYSIS',
	techlead: '#PLANNING',
	designer: '#DESIGN',
	developer: '#DEV',
	manager: '#MANAGE',
}

const textOf = (comment) => (comment.comment_text ?? '').trimStart()

/** Комментарий роли начинается с её хештега. Всё остальное в ленте написал владелец. */
const isRoleComment = (comment) =>
	Object.values(HASHTAGS).some((tag) => textOf(comment).startsWith(tag))

/**
 * Размер задачи владелец задаёт тегом в ClickUp. Тег может меняться между
 * этапами: крупный анализ, а следом простое планирование по готовой карте.
 *
 * Тега нет — значит normal, а тимлид может проставить размер сам
 * (`clickup_set_size`). Если тегов несколько, берём больший: недооценить
 * масштаб дороже, чем переоценить.
 */
const SIZES = ['simple', 'normal', 'hard']

const sizeTagsOf = (tags) => tags.filter((tag) => SIZES.includes(tag))

function sizeOf(tags) {
	const found = sizeTagsOf(tags)

	if (found.length === 0) return 'normal'

	return found.reduce((a, b) => (SIZES.indexOf(a) > SIZES.indexOf(b) ? a : b))
}

/**
 * Занятость задачи — тоже тег: `on` — роль уже работает, `off` — свободна.
 * Нужна, чтобы параллельно запущенные роли не брали одну задачу.
 *
 * Тега нет вовсе — задача свободна: `on` ставит только `clickup_take`.
 *
 * Это не настоящая блокировка: «проверить тег» и «поставить тег» — два запроса,
 * и две роли, стартовавшие в одну секунду, могут взять задачу обе.
 */
const BUSY = 'on'
const FREE = 'off'

/**
 * Отложенная задача — тег `hold`. Менеджер ставит его, убирая в OVERVIEW задачу,
 * которая ждёт другие или столкнётся с ними в коде, и снимает, возвращая её в
 * PLANNING. Так OVERVIEW делится на две очереди: отложенные менеджер выпускает
 * сам, остальные — только после ответа владельца.
 */
const HOLD = 'hold'

const tagPath = (taskId, tag) => `/task/${taskId}/tag/${encodeURIComponent(tag)}`

/** Переставить тег занятости. Удаляем только то, что висит: не шлём лишних запросов. */
async function setBusy(taskId, tags, busy) {
	const [add, remove] = busy ? [BUSY, FREE] : [FREE, BUSY]

	if (!tags.includes(add)) await api(tagPath(taskId, add), { method: 'POST' })
	if (tags.includes(remove)) await api(tagPath(taskId, remove), { method: 'DELETE' })
}

const tagsOf = (task) => (task.tags ?? []).map((tag) => tag.name.toLowerCase())

/**
 * Куда роль может отправить задачу по итогам этапа: исход → ключ `config.statuses`.
 *
 * Программист работает на той же модели, что и тимлид, поэтому расхождения с
 * планом решает сам и тимлиду задачу не возвращает: с тем, что решить не смог,
 * он идёт к владельцу (OVERVIEW). Дизайнер с вопросами идёт к тимлиду — разметку
 * по его спецификации планирует тимлид.
 *
 * Дизайнер — редкая роль для крупных задач, в DESIGN задачу отправляет тимлид
 * или владелец. Исходы: `done` — правились только тема и иконки, `questions` —
 * нужен код, дальше планирует тимлид.
 *
 * Менеджера здесь нет: он задачу не берёт и этап не завершает, а переставляет
 * чужие задачи — см. `MANAGER_MOVES`.
 */
const TRANSITIONS = {
	analyst: { review: 'overview' },
	techlead: { ready: 'inProgress', design: 'design', questions: 'overview', done: 'approved' },
	designer: { done: 'approved', questions: 'planning' },
	developer: { done: 'approved', questions: 'overview' },
}

/**
 * Статусы, на которых работает менеджер, и куда из каждого он может задачу
 * переставить. Здесь только направления — что ещё проверяется на переходе
 * (ответ владельца, `hold`, блокеры), решает `clickup_move`.
 *
 * Менеджер разводит параллельных программистов: пересекающиеся и зависимые
 * задачи откладывает в OVERVIEW, а когда путь свободен, возвращает в PLANNING.
 * Из PLANNING в работу — нельзя: план пишет и отдаёт в работу тимлид.
 * ANALYSIS, DESIGN и APPROVED менеджер не трогает — это этапы ролей и ревью
 * владельца.
 */
const MANAGER_MOVES = {
	overview: ['planning', 'inProgress'],
	planning: ['overview'],
	inProgress: ['planning', 'overview'],
}

/** Ключ `config.statuses` по статусу задачи. ClickUp отдаёт имя статуса в нижнем регистре. */
const statusKeyOf = (task) =>
	Object.keys(config.statuses).find((key) => config.statuses[key] === task.status?.status)

/* ─────────────────────────── Связи задач ─────────────────────────── */

/**
 * Зависимость ClickUp `{ task_id, depends_on }` читается как «task_id ждёт
 * depends_on». Одна и та же запись приходит в обеих задачах пары, поэтому
 * направление определяем по тому, с какой стороны стоит сама задача.
 */
const waitingOnIds = (task) =>
	(task.dependencies ?? []).filter((dep) => dep.task_id === task.id).map((dep) => dep.depends_on)

const blockingIds = (task) =>
	(task.dependencies ?? []).filter((dep) => dep.depends_on === task.id).map((dep) => dep.task_id)

/** Связь без зависимости. В паре `{ task_id, link_id }` вторая задача — та, что не эта. */
const linkedIds = (task) =>
	(task.linked_tasks ?? []).map((link) =>
		link.task_id === task.id ? link.link_id : link.task_id,
	)

/**
 * Блокер снят, только когда задача завершена: статус типа `closed` или `done`
 * (в Space есть оба — `complete` и `done`). APPROVED не в счёт: PR ещё не
 * в `main`, и ветка зависимой задачи его изменений не увидит.
 */
const isClosed = (task) =>
	['closed', 'done'].includes(task.status?.type) || task.status?.status === config.statuses.closed

/**
 * Задачи, которых ждут переданные. Статус блокера ClickUp в ответе не отдаёт,
 * а без него не понять, заблокирована ли задача, — дочитываем каждую.
 *
 * Блокер, который прочитать не удалось, в карту не попадёт и будет считаться
 * открытым: лучше лишний раз придержать задачу, чем отдать её в работу раньше
 * того, от чего она зависит.
 */
async function blockersOf(tasks) {
	const ids = [...new Set(tasks.flatMap(waitingOnIds))]
	const found = await Promise.all(ids.map((id) => api(`/task/${id}`).catch(() => null)))

	return new Map(found.filter(Boolean).map((task) => [task.id, task]))
}

/* ─────────────────────────── Формат ответов ─────────────────────────── */

/**
 * Задача целиком — это сотни полей, из которых ролям нужны единицы.
 * Возвращаем только их: контекст агента дороже полноты ответа.
 *
 * `blockers` — карта из `blockersOf`: без неё `blocked` не посчитать.
 */
function trimTask(task, blockers = new Map()) {
	const tags = tagsOf(task)
	const waitingOn = waitingOnIds(task).map((id) => {
		const blocker = blockers.get(id)

		return {
			id,
			name: blocker?.name ?? null,
			status: blocker?.status?.status ?? null,
			closed: blocker ? isClosed(blocker) : false,
		}
	})

	return {
		id: task.id,
		name: task.name,
		status: task.status?.status ?? null,
		// null — приоритет не проставлен; в очереди такая задача стоит как normal.
		priority: task.priority?.priority ?? null,
		size: sizeOf(tags),
		// false — тега размера нет, `size` подставлен по умолчанию.
		sizeTagged: sizeTagsOf(tags).length > 0,
		busy: tags.includes(BUSY),
		// true — задачу отложил менеджер: ждёт задачи из `waitingOn`, вернётся в PLANNING.
		hold: tags.includes(HOLD),
		// true — задача ждёт незакрытую задачу из `waitingOn`: брать её рано.
		blocked: waitingOn.some((dep) => !dep.closed),
		waitingOn,
		blocking: blockingIds(task),
		linked: linkedIds(task),
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

/**
 * Комментарий роли. Хештег ставим здесь, а не в промпте: на нём держится вся
 * цепочка этапов, и полагаться на то, что модель его не забудет, нельзя.
 */
async function postComment(taskId, role, text) {
	const hashtag = HASHTAGS[role]

	if (!hashtag) {
		throw new Error(
			`Неизвестная роль "${role}". Ожидается: ${Object.keys(HASHTAGS).join(', ')}`,
		)
	}

	const body = text.trimStart().startsWith(hashtag) ? text.trimStart() : `${hashtag}\n\n${text}`
	const parts = chunk(body, config.commentChunkSize ?? 30000)

	for (const part of parts) {
		await api(`/task/${taskId}/comment`, {
			method: 'POST',
			body: JSON.stringify({ comment_text: part, notify_all: false }),
		})
	}

	return parts.length
}

/**
 * Задача, которую менеджер может менять. Проверяем здесь, а не в промпте:
 * задачу с тегом `on` прямо сейчас делает роль, и приоритет или статус,
 * переставленные у неё под руками, ломают заход незаметно для всех.
 */
async function managedTask(taskId, role) {
	if (role !== 'manager') {
		throw new Error(
			`Роль "${role}" не может менять приоритет и статус чужих задач — это работа менеджера.`,
		)
	}

	const task = await api(`/task/${taskId}`)

	if (tagsOf(task).includes(BUSY)) {
		throw new Error(`Задача ${taskId} в работе у роли (тег "${BUSY}") — не трогай её.`)
	}

	const key = statusKeyOf(task)

	if (!MANAGER_MOVES[key]) {
		const scope = Object.keys(MANAGER_MOVES).map((k) => config.statuses[k])

		throw new Error(
			`Задача ${taskId} в статусе "${task.status?.status}". Менеджер работает только со статусами: ${scope.join(', ')}.`,
		)
	}

	return { task, key }
}

/* ─────────────────────────── Инструменты ─────────────────────────── */

const tools = {
	clickup_get_task: {
		description:
			'Прочитать задачу ClickUp: название, описание, статус, приоритет, размер (size), занятость, зависимости (waitingOn, blocking, blocked), связи, исполнителей, теги. Возвращает урезанный набор полей.',
		schema: {
			type: 'object',
			properties: { task_id: { type: 'string', description: 'ID задачи ClickUp' } },
			required: ['task_id'],
		},
		async run({ task_id }) {
			const task = await api(`/task/${task_id}`)

			return trimTask(task, await blockersOf([task]))
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
					enum: Object.keys(HASHTAGS),
					description: 'Твоя роль. Определяет хештег этапа.',
				},
				text: { type: 'string', description: 'Markdown-текст комментария, без хештега' },
			},
			required: ['task_id', 'role', 'text'],
		},
		async run({ task_id, role, text }) {
			return { posted: await postComment(task_id, role, text) }
		},
	},

	clickup_take: {
		description:
			'Взять задачу в работу: ставит тег `on`. Вызывай ПЕРВЫМ, до чтения задачи. Если задача уже в работе у другой роли — вернёт ошибку: тогда остановись и ничего не делай. Освобождает задачу `clickup_handoff`.',
		schema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				role: {
					type: 'string',
					enum: Object.keys(TRANSITIONS),
					description: 'Твоя роль.',
				},
			},
			required: ['task_id', 'role'],
		},
		async run({ task_id, role }) {
			if (!TRANSITIONS[role]) {
				throw new Error(
					`Неизвестная роль "${role}". Ожидается: ${Object.keys(TRANSITIONS).join(', ')}`,
				)
			}

			const tags = tagsOf(await api(`/task/${task_id}`))

			if (tags.includes(BUSY)) {
				throw new Error(
					`Задача ${task_id} уже в работе (тег "${BUSY}"). Не бери её: остановись и сообщи об этом.`,
				)
			}

			await setBusy(task_id, tags, true)

			// Задачу взяла роль — значит, она больше не отложена. Забытый `hold`
			// (владелец вытащил задачу руками) позже выпустил бы её из OVERVIEW мимо
			// его ответа.
			if (tags.includes(HOLD)) await api(tagPath(task_id, HOLD), { method: 'DELETE' })

			return { taken: task_id, tag: BUSY }
		},
	},

	clickup_handoff: {
		description:
			'Завершить свой этап и перевести задачу в следующий статус. Куда именно — задаёт `outcome`, допустимые исходы зависят от роли. Снимает с задачи тег `on` — она освобождается для следующей роли. Вызывай последним, ПОСЛЕ того как оставил комментарий.',
		schema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				role: {
					type: 'string',
					enum: Object.keys(TRANSITIONS),
					description: 'Твоя роль. Определяет, какие исходы разрешены.',
				},
				outcome: {
					type: 'string',
					enum: [...new Set(Object.values(TRANSITIONS).flatMap(Object.keys))],
					description:
						'analyst: review (→ OVERVIEW). techlead: ready (план готов, вопросов нет → IN PROGRESS), design (нужен дизайн → DESIGN), questions (нужен владелец → OVERVIEW), done (работа программиста принята → APPROVED). designer: done (правились только тема и иконки, PR открыт → APPROVED), questions (нужен код или решение тимлида → PLANNING). developer: done (сделано и протестировано, PR открыт; остаток и находки, если есть, вынесены задачами → APPROVED), questions (критическое расхождение, задача не сделана → OVERVIEW).',
				},
			},
			required: ['task_id', 'role', 'outcome'],
		},
		async run({ task_id, role, outcome }) {
			const allowed = TRANSITIONS[role]

			if (!allowed) {
				throw new Error(
					`Неизвестная роль "${role}". Ожидается: ${Object.keys(TRANSITIONS).join(', ')}`,
				)
			}

			// Переходы проверяем здесь, а не в промпте: задача, отправленная не
			// в тот статус, выпадает из потока незаметно для всех.
			const key = allowed[outcome]

			if (!key) {
				throw new Error(
					`Роль "${role}" не может завершить этап исходом "${outcome}". Ожидается: ${Object.keys(allowed).join(', ')}`,
				)
			}

			const status = config.statuses[key]
			const owner = Number(requireConfig('ownerId'))

			await api(`/task/${task_id}`, {
				method: 'PUT',
				body: JSON.stringify({ status, assignees: { add: [owner] } }),
			})

			// Освобождаем после смены статуса: иначе задача на мгновение окажется
			// свободной в старом статусе, и её подхватит ещё одна роль того же этапа.
			// Упадёт здесь — повторный handoff безопасен: статус тот же, теги дойдут.
			await setBusy(task_id, tagsOf(await api(`/task/${task_id}`)), false)

			return { status, assigned_to: owner, tag: FREE }
		},
	},

	clickup_set_size: {
		description:
			'Проставить размер задачи тегом, если владелец его не поставил (`sizeTagged: false` в `clickup_get_task`). Только для тимлида. Тег владельца не перезаписывает — вернёт ошибку.',
		schema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				role: {
					type: 'string',
					enum: ['techlead'],
					description: 'Твоя роль. Проставлять размер может только тимлид.',
				},
				size: { type: 'string', enum: SIZES, description: 'Твоя оценка масштаба задачи.' },
			},
			required: ['task_id', 'role', 'size'],
		},
		async run({ task_id, role, size }) {
			if (role !== 'techlead') {
				throw new Error(`Роль "${role}" не может проставлять размер. Работай по полю size.`)
			}

			if (!SIZES.includes(size)) {
				throw new Error(`Неизвестный размер "${size}". Ожидается: ${SIZES.join(', ')}`)
			}

			// Проверяем здесь, а не в промпте: размер, поставленный владельцем, —
			// его решение, и роль не должна его переписать даже по ошибке.
			const existing = sizeTagsOf(tagsOf(await api(`/task/${task_id}`)))

			if (existing.length > 0) {
				throw new Error(
					`Размер уже задан тегом "${existing.join(', ')}" — это решение владельца, не меняй его.`,
				)
			}

			await api(tagPath(task_id, size), { method: 'POST' })

			return { size }
		},
	},

	clickup_set_priority: {
		description:
			'Поставить задаче приоритет. Только для менеджера и только задаче в IN PROGRESS, PLANNING или OVERVIEW без тега `on`. Роли берут задачи в порядке urgent → high → normal → low.',
		schema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				role: {
					type: 'string',
					enum: ['manager'],
					description: 'Твоя роль. Приоритеты расставляет только менеджер.',
				},
				priority: { type: 'string', enum: PRIORITIES },
			},
			required: ['task_id', 'role', 'priority'],
		},
		async run({ task_id, role, priority }) {
			if (!PRIORITIES.includes(priority)) {
				throw new Error(
					`Неизвестный приоритет "${priority}". Ожидается: ${PRIORITIES.join(', ')}`,
				)
			}

			const { task } = await managedTask(task_id, role)
			const was = task.priority?.priority ?? null

			if (was !== priority) {
				// В API приоритет — число: 1 urgent … 4 low.
				await api(`/task/${task_id}`, {
					method: 'PUT',
					body: JSON.stringify({ priority: PRIORITIES.indexOf(priority) + 1 }),
				})
			}

			return { priority, was }
		},
	},

	clickup_move: {
		description:
			'Переставить задачу между IN PROGRESS, PLANNING и OVERVIEW. Только для менеджера и только задачу без тега `on`. Сначала оставь комментарий с причиной, потом вызывай. В OVERVIEW задача уходит либо отложенной (`hold: true`, тег `hold`) — до закрытия задач, которых ждёт, — либо владельцу (`hold: false`). Сервер откажет: отложить задачу, которая не ждёт незакрытых задач; вернуть отложенную куда-либо, кроме PLANNING, или пока она ещё ждёт; выпустить из OVERVIEW неотложенную задачу, пока владелец не ответил после последнего комментария роли; в IN PROGRESS — без плана #PLANNING или с незакрытыми блокерами; из PLANNING — куда-либо, кроме OVERVIEW.',
		schema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				role: {
					type: 'string',
					enum: ['manager'],
					description: 'Твоя роль. Переставлять задачи может только менеджер.',
				},
				status: {
					type: 'string',
					enum: Object.keys(MANAGER_MOVES).map((key) => config.statuses[key]),
					description: 'Куда переставить.',
				},
				hold: {
					type: 'boolean',
					description:
						'Только при status overview. true — отложить: задача ждёт незакрытые задачи (waits_on) и вернётся в PLANNING, когда они закроются. false (по умолчанию) — вопрос владельцу.',
				},
			},
			required: ['task_id', 'role', 'status'],
		},
		async run({ task_id, role, status, hold = false }) {
			const { task, key } = await managedTask(task_id, role)
			const target = MANAGER_MOVES[key].find((to) => config.statuses[to] === status)

			if (!target) {
				const allowed = MANAGER_MOVES[key].map((to) => config.statuses[to])

				throw new Error(
					`Из "${task.status.status}" менеджер переставляет только в: ${allowed.join(', ')}.`,
				)
			}

			if (hold && target !== 'overview') {
				throw new Error('`hold` ставится только при перестановке в OVERVIEW.')
			}

			const tagged = tagsOf(task).includes(HOLD)
			// Тег вне OVERVIEW — забытый: задачу вытащили руками. Отложенной её не считаем.
			const held = key === 'overview' && tagged
			const open = trimTask(task, await blockersOf([task]))
				.waitingOn.filter((dep) => !dep.closed)
				.map((dep) => dep.id)

			// Отложенную задачу пора вернуть, когда закрылось то, чего она ждёт. Без
			// зависимости этот момент не определить, и задача осела бы в OVERVIEW.
			if (hold && open.length === 0) {
				throw new Error(
					`Задача ${task_id} не ждёт незакрытых задач — откладывать нечего. Сначала свяжи её waits_on с задачей, которой она уступает.`,
				)
			}

			if (held) {
				// Пока задача ждала, main ушёл вперёд: план сверяет тимлид, в работу напрямую нельзя.
				if (target !== 'planning') {
					throw new Error(
						`Задача ${task_id} отложена (тег "${HOLD}") — вернуть её можно только в PLANNING: план сверит тимлид.`,
					)
				}

				if (open.length > 0) {
					throw new Error(
						`Задача ${task_id} ещё ждёт: ${open.join(', ')} — возвращать рано.`,
					)
				}
			}

			if ((key === 'overview' && !held) || target === 'inProgress') {
				// От новых к старым: первый подходящий — последний по времени.
				const { comments = [] } = await api(`/task/${task_id}/comment`)

				if (key === 'overview' && !held) {
					// Неотложенная задача в OVERVIEW ждёт владельца: выпускает её только его ответ.
					// Свою заметку менеджер оставляет перед перестановкой — её пропускаем.
					const last = comments.find(
						(comment) => !textOf(comment).startsWith(HASHTAGS.manager),
					)

					if (!last || isRoleComment(last)) {
						throw new Error(
							`Задача ${task_id} ждёт владельца: после последнего комментария роли он не ответил. Оставь её в OVERVIEW.`,
						)
					}
				}

				if (target === 'inProgress') {
					if (
						!comments.some((comment) => textOf(comment).startsWith(HASHTAGS.techlead))
					) {
						throw new Error(
							`В ленте задачи ${task_id} нет плана ${HASHTAGS.techlead} — в работу рано, её ждёт тимлид.`,
						)
					}

					if (open.length > 0) {
						throw new Error(
							`Задача ${task_id} ждёт незакрытые задачи: ${open.join(', ')} — в работу рано.`,
						)
					}
				}
			}

			const owner = Number(requireConfig('ownerId'))

			await api(`/task/${task_id}`, {
				method: 'PUT',
				body: JSON.stringify({
					status: config.statuses[target],
					assignees: { add: [owner] },
				}),
			})

			// Тег — после смены статуса: упадёт запрос, и задача останется в OVERVIEW
			// без `hold`, то есть в очереди владельца, а не выпустится мимо него.
			const keep = target === 'overview' && hold

			if (keep && !tagged) await api(tagPath(task_id, HOLD), { method: 'POST' })
			if (!keep && tagged) await api(tagPath(task_id, HOLD), { method: 'DELETE' })

			return { status: config.statuses[target], was: task.status.status, hold: keep }
		},
	},

	clickup_link_tasks: {
		description:
			'Связать две задачи. `waits_on` — зависимость ClickUp: `task_id` нельзя начинать, пока не закрыта `other_task_id`; роли такую задачу из очереди не берут. `related` — просто связь, ничего не блокирует. Для менеджера и тимлида. Менеджер не может менять `task_id` с тегом `on`. Удалять связи инструмент не умеет.',
		schema: {
			type: 'object',
			properties: {
				task_id: {
					type: 'string',
					description: 'Задача, которую связываешь. Для waits_on — та, что ждёт.',
				},
				role: {
					type: 'string',
					enum: ['manager', 'techlead'],
					description: 'Твоя роль. Связывать задачи могут менеджер и тимлид.',
				},
				relation: {
					type: 'string',
					enum: ['waits_on', 'related'],
					description:
						'waits_on — task_id ждёт other_task_id. related — связь без ожидания.',
				},
				other_task_id: {
					type: 'string',
					description:
						'Для waits_on — задача, которую ждут: пока она не закрыта, task_id заблокирована.',
				},
			},
			required: ['task_id', 'role', 'relation', 'other_task_id'],
		},
		async run({ task_id, role, relation, other_task_id }) {
			if (role !== 'manager' && role !== 'techlead') {
				throw new Error(`Роль "${role}" не может связывать задачи.`)
			}

			if (relation !== 'waits_on' && relation !== 'related') {
				throw new Error(`Неизвестная связь "${relation}". Ожидается: waits_on, related`)
			}

			if (task_id === other_task_id) {
				throw new Error('Задачу нельзя связать саму с собой.')
			}

			const task = await api(`/task/${task_id}`)

			// Тимлид связывает и задачу, которую сам держит под `on`. Менеджеру задачи
			// в работе недоступны, но ждать задачу в работе — можно: связь ставится
			// со стороны ждущей.
			if (role === 'manager' && tagsOf(task).includes(BUSY)) {
				throw new Error(`Задача ${task_id} в работе у роли (тег "${BUSY}") — не трогай её.`)
			}

			const result = { task_id, relation, other_task_id }

			if (relation === 'related') {
				if (linkedIds(task).includes(other_task_id)) return { ...result, already: true }

				await api(`/task/${task_id}/link/${other_task_id}`, { method: 'POST' })

				return result
			}

			if (waitingOnIds(task).includes(other_task_id)) return { ...result, already: true }

			// Две задачи, ждущие друг друга, не возьмёт ни одна роль. Ловим только
			// прямой цикл: длинный требует обхода всего графа.
			if (blockingIds(task).includes(other_task_id)) {
				throw new Error(
					`${other_task_id} уже ждёт ${task_id} — обратная зависимость замкнёт цикл, и обе задачи встанут.`,
				)
			}

			await api(`/task/${task_id}/dependency`, {
				method: 'POST',
				body: JSON.stringify({ depends_on: other_task_id }),
			})

			return result
		},
	},

	clickup_list_by_status: {
		description:
			'Найти задачи в заданном статусе. Список отсортирован по приоритету (urgent → high → normal → low; без приоритета — как normal), внутри приоритета — от старых к новым. `busy: true` — задача уже в работе у роли (тег `on`); `blocked: true` — ждёт незакрытую задачу из `waitingOn`. Ни ту, ни другую брать нельзя.',
		schema: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					description: 'Например: ANALYSIS, PLANNING, DESIGN, IN PROGRESS',
				},
			},
			required: ['status'],
		},
		async run({ status }) {
			const tasks = await tasksByStatus(status)
			const blockers = await blockersOf(tasks)

			return tasks.map((task) => trimTask(task, blockers))
		},
	},

	clickup_create_task: {
		description:
			'Завести отдельную задачу на работу, не входящую в текущую. Новая задача ложится владельцу в OVERVIEW — в очередь ролей она сама не попадёт. `description` — для владельца, простым текстом; `plan` сервер публикует первым комментарием новой задачи с хештегом твоей роли. Не заменяет отчёт: упомяни созданную задачу в своём комментарии.',
		schema: {
			type: 'object',
			properties: {
				source_task_id: {
					type: 'string',
					description:
						'ID задачи, в которой ты нашёл проблему. Определяет список и даёт ссылку на источник.',
				},
				role: {
					type: 'string',
					enum: ['techlead', 'developer'],
					description:
						'Твоя роль. Тимлид — побочные находки и то, что не влезает в заход. Программист — побочные находки и остаток задачи: критическое расхождение или объём больше ожидаемого.',
				},
				name: {
					type: 'string',
					description:
						'Заголовок: что именно не так. Одна строка, без «нужно доработать».',
				},
				description: {
					type: 'string',
					description:
						'Для владельца: 2–4 строки о том, что не так и почему это стоит сделать, обычными словами — он читает это в OVERVIEW без твоего контекста. Простой текст: описание задачи ClickUp не понимает Markdown. Без разметки, путей к файлам, имён классов и сигнатур.',
				},
				plan: {
					type: 'string',
					description:
						'Markdown для исполнителя, уйдёт первым комментарием новой задачи. Тимлид — план в формате своего комментария. Программист — что уже сделано в исходной задаче (PR), что сделать и почему вынесено, с полными путями к файлам.',
				},
				size: {
					type: 'string',
					enum: SIZES,
					description: 'Необязательно. Твоя оценка; владелец может её изменить.',
				},
			},
			required: ['source_task_id', 'role', 'name', 'description', 'plan'],
		},
		async run({ source_task_id, role, name, description, plan, size }) {
			if (!['techlead', 'developer'].includes(role)) {
				throw new Error(`Роль "${role}" не может заводить задачи.`)
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
			// Описание — простой текст: разметку ClickUp покажет в нём как есть.
			const origin = `\n\nВыделено из задачи «${source.name}» на этапе ${HASHTAGS[role]}: ${source.url}`

			const created = await api(`/list/${listId}/task`, {
				method: 'POST',
				body: JSON.stringify({
					name,
					description: description + origin,
					// OVERVIEW, а не первый статус потока: задача должна дождаться
					// решения владельца, а не уехать в очередь ролей сама собой.
					status: config.statuses.overview,
					assignees: [owner],
					tags: size ? [size, FREE] : [FREE],
					notify_all: false,
				}),
			})

			// План — комментарием роли, а не в описании: `#PLANNING` в ленте нужен,
			// чтобы задачу можно было отдать программисту, не прогоняя через тимлида.
			await postComment(created.id, role, plan)

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
