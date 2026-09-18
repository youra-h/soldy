import { underscorePropNaming } from '@soldy/setup'
import { propControls } from '../props'
import type { TComponentEntry, TPropControl } from '../types'
import type { TAutoScenario } from './types'

/** Что опрашивается: строка свойства и полные имена её триггеров. */
export type TPollTarget = {
	control: TPropControl
	triggers: readonly string[]
}

/**
 * Пропы, которые опрос берёт: записываемые компонентные с триггерами.
 *
 * Триггеры — полные имена из декларации (`trigger.getName()`): так их видит
 * журнал, и так их зовёт потребитель Vue.
 */
export function pollTargets(entry: TComponentEntry): TPollTarget[] {
	const declarations = entry.descriptor().props

	return propControls(entry).componentControls.flatMap((control) => {
		const declaration = declarations.find(
			(prop) => underscorePropNaming(prop.name) === control.name,
		)
		const triggers = (declaration?.triggers ?? []).map((trigger) => trigger.getName())

		return triggers.length ? [{ control, triggers }] : []
	})
}

/**
 * Значение, которое точно отличается от текущего.
 *
 * Выводится из вида контрола, как и сам контрол на странице свойств: список
 * значений сильнее типа.
 */
function nextValue(control: TPropControl, current: unknown): unknown {
	switch (control.kind) {
		case 'switch':
			return !current
		case 'select':
			return control.options?.find((option) => option !== current)
		case 'number':
			return (typeof current === 'number' ? current : 0) + 1
		case 'text':
			return current === `опрос ${control.name}`
				? `опрос ${control.name}!`
				: `опрос ${control.name}`
	}
}

/**
 * Новое значение в аргументах события и форма, в которой оно пришло.
 *
 * Форма у триггеров разная: одни отдают значение как есть, другие —
 * `{ newValue, oldValue }` (`TValuePayload`). Опрос проверяет, что новое
 * значение до потребителя доходит, а форму называет в тексте проверки.
 */
function carried(args: readonly unknown[] | undefined): { value: unknown; form: string } {
	const [first] = args ?? []

	if (typeof first === 'object' && first !== null && 'newValue' in first) {
		return { value: first.newValue, form: '{ newValue, oldValue }' }
	}

	return { value: first, form: 'значение как есть' }
}

/**
 * Опрос событий — первый тест любого компонента.
 *
 * Не сценарии, написанные руками, а фабрика по строкам свойств: у компонента
 * десятки пропов, и список, который ведут руками, отстал бы от дескриптора
 * так же, как отставало прежнее демо. Сценарий получает каждая цель
 * `pollTargets`.
 *
 * Проп пишется через экземпляр, а события читаются из журнала — то есть так,
 * как их получил потребитель фреймворка. Каждый триггер обязан прийти ровно
 * один раз, а повторная запись того же значения событий не даёт (AGENTS.md:
 * «`change:*` эмитится только при реальном изменении»). Аргументы уходят в
 * консоль через журнал.
 *
 * Плагинные и коллекционные пропы пишутся иначе (плагин из bundle, фасад
 * коллекции — см. строку свойств Vue) и в опрос пока не входят.
 */
export function eventsPoll(entry: TComponentEntry): TAutoScenario[] {
	return pollTargets(entry).map(({ control, triggers }) => {
		const { name } = control
		const own = `change:${name}`

		return {
			id: `${entry.id}/events/poll-${name}`,
			component: entry.id,
			topic: 'events',
			kind: 'auto',
			title: `Опрос: ${name}`,
			description: `Пишет ${name} через экземпляр: ${triggers.join(', ')} приходит ровно один раз, повторная запись того же значения событий не даёт`,
			run: async (ctx) => {
				const next = nextValue(control, ctx.instance[name])
				const from = ctx.journal.entries.length

				ctx.instance[name] = next
				await ctx.frame()

				ctx.check(
					ctx.instance[name] === next,
					`${name} принял ${JSON.stringify(next)} (сейчас ${JSON.stringify(ctx.instance[name])})`,
				)

				for (const trigger of triggers) {
					const count = ctx.journal.count(trigger, from)

					ctx.check(count === 1, `${trigger} пришло ровно один раз (пришло ${count})`)
				}

				// Нагрузка производного триггера не обязана совпадать со свойством
				// (`present` слушает `change:rendered`), поэтому сверяется только свой
				if (triggers.includes(own) && ctx.journal.count(own, from)) {
					const { value, form } = carried(ctx.journal.last(own))

					ctx.check(value === next, `${own} несёт новое значение — ${form}`)
				}

				const again = ctx.journal.entries.length

				ctx.instance[name] = next
				await ctx.frame()

				for (const trigger of triggers) {
					const count = ctx.journal.count(trigger, again)

					ctx.check(
						count === 0,
						`повторная запись того же значения не даёт ${trigger} (пришло ${count})`,
					)
				}
			},
		}
	})
}
