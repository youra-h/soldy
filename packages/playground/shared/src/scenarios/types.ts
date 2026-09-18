import type { TInstance } from '../instance'

/**
 * Как сценарий доходит до итога.
 *
 * `auto` — без человека: сам меняет компонент и сам проверяет. `manual` — ждёт
 * действий человека по шагам (клик, клавиатура, взгляд на раскладку).
 */
export type TScenarioKind = 'auto' | 'manual'

/**
 * Состояние сценария.
 *
 * `waiting` — только у ручного: сцена готова, сценарий ждёт человека.
 */
export type TScenarioStatus = 'idle' | 'running' | 'waiting' | 'passed' | 'failed'

/** Тема страницы тестов — пункт левого меню. */
export type TTopicId = 'events' | 'slots'

export type TTopic = {
	id: TTopicId
	label: string
	description: string
}

/** Одна проверка прогона: условие и то, что оно утверждает. */
export type TScenarioCheck = {
	ok: boolean
	text: string
}

/** Событие, которое получил потребитель фреймворка, с аргументами. */
export type TJournalEntry = {
	/** Полное имя аксессора: `change:text`, `action:press`, `update:text`. */
	name: string
	args: readonly unknown[]
}

/**
 * Журнал прогона: события компонента в порядке прихода.
 *
 * Пишет его хост — тем, что слушает компонент так же, как слушал бы
 * потребитель. Читает сценарий.
 */
export interface IScenarioJournal {
	readonly entries: readonly TJournalEntry[]
	record(name: string, args: readonly unknown[]): void
	/** Сколько раз пришло событие, начиная с записи `from`. */
	count(name: string, from?: number): number
	/** Аргументы последнего такого события. */
	last(name: string): readonly unknown[] | undefined
	/** Имена по порядку прихода — только из списка `only`, начиная с `from`. */
	names(only: readonly string[], from?: number): string[]
}

/**
 * То, чем сценарий управляет компонентом и проверяет его.
 *
 * Всё без фреймворка: экземпляр ядра, DOM-узел сцены и журнал. Сценарий,
 * написанный на этом контексте, один на все стенды.
 */
export interface IScenarioContext {
	/** Экземпляр ядра — тот, что ушёл компоненту как `ctrl`. */
	readonly instance: TInstance
	/** Узел сцены, в которой смонтирован компонент. */
	readonly scene: HTMLElement
	readonly journal: IScenarioJournal
	/**
	 * Отмена прогона — и его конец. Нативные слушатели, повешенные с
	 * `{ signal }`, снимутся сами.
	 */
	readonly signal: AbortSignal
	/** Записать проверку. Упавшая прогон не прерывает, но роняет итог. */
	check(ok: boolean, text: string): boolean
	/** Следующий кадр: к нему компонент уже отрисовал записанное. */
	frame(): Promise<void>
	pause(ms: number): Promise<void>
	/** Ждать, пока условие не выполнится. `what` — что ждём, для текста ошибки. */
	until(condition: () => boolean, what: string): Promise<void>
	/** Ждать, пока событие не придёт `count` раз с начала прогона. */
	events(name: string, count?: number): Promise<void>
	/** Ширина сцены, px; `null` — по содержимому страницы. */
	resize(width: number | null): void
}

type TScenarioBase = {
	/** Уникален на весь реестр: `button/events/text`. Идёт в консоль. */
	id: string
	/** Идентификатор компонента в реестре (`COMPONENTS`). */
	component: string
	topic: TTopicId
	title: string
	/** Что сценарий проверяет. */
	description: string
	/** Стартовые пропы — именами, как их пишут в разметке. */
	props?: Readonly<Record<string, unknown>>
	/**
	 * Ключ фикстуры адаптера — разметки со слотами. Без ключа компонент
	 * рисуется превью со страницы свойств.
	 */
	fixture?: string
}

export type TAutoScenario = TScenarioBase & {
	kind: 'auto'
	steps?: never
	run: (ctx: IScenarioContext) => Promise<void> | void
}

/**
 * Ручной сценарий.
 *
 * Шаги говорят человеку, что делать. `run` необязателен: если он есть и его
 * условие выполнилось, сценарий засчитывается сам; без него итог ставят
 * только кнопки ✓ и ✗.
 */
export type TManualScenario = TScenarioBase & {
	kind: 'manual'
	steps: readonly string[]
	run?: (ctx: IScenarioContext) => Promise<void> | void
}

export type TScenario = TAutoScenario | TManualScenario

/** Что хост монтирует: сценарий, экземпляр для `ctrl` и журнал для событий. */
export type TScenarioMount = {
	scenario: TScenario
	instance: TInstance
	journal: IScenarioJournal
}

/**
 * Фреймворковая половина раннера.
 *
 * Монтирует компонент в сцену блока сценария и отдаёт узел сцены, когда
 * компонент отрисован. Стенду каждого фреймворка — свой хост; раннер и
 * сценарии общие.
 */
export interface IScenarioHost {
	mount(mount: TScenarioMount): Promise<HTMLElement>
	/** Снять сцену. Разрешается, когда фреймворк компонент уже размонтировал. */
	unmount(id: string): Promise<void>
}

export type TScenarioState = {
	status: TScenarioStatus
	checks: readonly TScenarioCheck[]
	/** Почему прогон оборвался: исключение сценария или таймаут. */
	error?: string
	/** Итог поставил человек, а не условие сценария. */
	marked?: boolean
}

export type TScenarioSummary = {
	auto: { total: number; passed: number; failed: number }
	manual: { total: number; passed: number; waiting: number; failed: number }
	/** Сколько упало всего. */
	failed: number
	/** Прошли все до одного. */
	passed: boolean
}
