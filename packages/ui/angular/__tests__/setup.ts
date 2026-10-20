/**
 * Окружение спеков Angular (`setupFiles` цели `test` в `angular.json`): его
 * билдер выполняет перед файлами спеков, после TestBed. Ошибка или
 * предупреждение в консоли роняет тест, а при загрузке файла спека — весь
 * файл.
 */

import { beforeAll, beforeEach, expect, onTestFinished } from 'vitest'
import { format } from 'node:util'
import { useIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'

/**
 * Пакет иконок подключает приложение — как тему. Спеки играют роль
 * приложения: без пакета иконка по роли рисует заглушку и предупреждает в
 * консоль о роли, которой нет, — а консоль здесь роняет тест. Тот же вызов —
 * в настройке тестов React, Svelte и Solid.
 */

useIcons(material)

/**
 * Заглушка `ResizeObserver`: jsdom его не реализует, а Frame следит им за
 * размером панели и якоря (`TAnchorPlugin`). Без заглушки узел, объявленный
 * `element:ready`, валит необработанную ошибку. Та же заглушка — в настройке
 * тестов Vue, React, Svelte и Solid.
 */

if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	globalThis.ResizeObserver = ResizeObserverStub
}

/**
 * Сторож консоли: `console.error` или `console.warn` роняет тест, в котором
 * прозвучал, а прозвучавший при загрузке файла спека — весь файл.
 *
 * Правило то же, что у React (`packages/ui/react/__tests__/setup.ts`). О
 * проблеме спека — совпавшем id двух хостов, дубле ключа `track` в `@for` —
 * Angular сообщает только строкой в консоли, и прогон оставался зелёным: так
 * незамеченным и жило предупреждение NG0912. Вывод сторож не глушит: в логе
 * прогона он остаётся таким, каким его напечатали. Фильтра по тексту нет
 * намеренно: шумит сторож — чинится причина, а не он. Тест, который вывод
 * ожидает (предупреждение подписи о вложенном `label`), заявляет это своим
 * шпионом с заглушкой — `vi.spyOn(console, 'warn').mockImplementation(() => {})`:
 * заглушка метод под шпионом не зовёт, и сторож такого вызова не видит.
 * Поэтому сам сторож — обёртка, а не `vi.spyOn`: повторный `vi.spyOn` на тот
 * же метод вернул бы шпиона сторожа, и заявленный тестом вывод уронил бы тест.
 *
 * Своё у Angular — когда приходит вывод. Часть предупреждений режима
 * разработки он печатает при загрузке файла спека, а не в тесте: NG0912 — при
 * определении класса компонента, до первого теста. Поэтому обёртку сторож
 * ставит уже здесь: файл настройки билдер выполняет раньше файла спека.
 * Пойманное при загрузке проверяет `beforeAll` сторожа — первый хук файла, —
 * и упавший хук роняет файл, не запуская его тестов. Вывод `beforeAll` и
 * `afterAll` самого спека сторож не видит: они идут между его фазами, как и
 * у React.
 *
 * Тест сторож проверяет в `onTestFinished`, а не в `afterEach`: фикстуры
 * TestBed снимает `afterEach` билдера (`init-testbed`), а он поставлен раньше
 * этого файла и при порядке хуков `stack` — умолчании Vitest, которого билдер
 * не меняет, — шёл бы после `afterEach` отсюда. Вывод при снятии компонентов
 * прошёл бы мимо, а `onTestFinished` Vitest зовёт после всех `afterEach`: к
 * проверке тест уже снял своих шпионов, а TestBed — фикстуры.
 */

/** Методы консоли, вызов которых роняет тест. */
type TGuardedMethod = 'error' | 'warn'

/** Обернуть метод консоли: вызов записывается в `into` и печатается как есть. */
function watch(method: TGuardedMethod, into: string[]): () => void {
	const original: (...args: unknown[]) => void = console[method]

	console[method] = (...args: unknown[]) => {
		into.push(`console.${method}: ${format(...args)}`)
		original.apply(console, args)
	}

	return () => {
		console[method] = original
	}
}

/** Обернуть оба метода консоли; возвращает, как их вернуть. */
function watchConsole(into: string[]): () => void {
	const restore = [watch('error', into), watch('warn', into)]

	return () => {
		for (const undo of restore) undo()
	}
}

/** Вернуть консоль и уронить фазу, если в консоль что-то ушло. */
function settle(restore: () => void, caught: readonly string[], phase: string): void {
	// Консоль возвращается до проверки: после упавшего `expect` хук дальше не идёт
	restore()

	expect(caught, `в консоль ушли ошибки или предупреждения ${phase}`).toEqual([])
}

/** Тексты вызовов при загрузке файла спека — как их печатает консоль. */
const loading: string[] = []
const restoreLoading = watchConsole(loading)

beforeAll(() => settle(restoreLoading, loading, 'при загрузке файла'))

beforeEach(() => {
	const caught: string[] = []
	const restore = watchConsole(caught)

	onTestFinished(() => settle(restore, caught, 'в тесте'))
})
