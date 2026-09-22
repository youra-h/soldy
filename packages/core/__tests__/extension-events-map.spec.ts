import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import * as ts from 'typescript'
import { TEvented, TSelect, TSelectExtension, TTabs, TTabsExtension } from '@soldy-ui/core'
import type {
	ISelectExtension,
	ITabsExtension,
	TNoEvents,
	TSelectItemEventsExtension,
	TTabsItemEventsExtension,
} from '@soldy-ui/core'

/**
 * Сторож правила «интерфейс расширения передаёт карту событий вторым аргументом
 * `IExtension`» (см. AGENTS.md, «Карта событий выводится из источника, а не
 * переписывается»).
 *
 * Item-адаптер берёт родителя через интерфейс (`TParent extends
 * ITabsExtension<TItem>`). Без второго аргумента `events` интерфейса — дефолт
 * `IExtension`, карта с индексной сигнатурой: `relay` из неё принимает любое
 * имя, и событие, переименованное в карте расширения, компилируется молча.
 */

const ROOT = resolve(__dirname, '../../..')
const COMPONENTS_DIR = resolve(__dirname, '../src/components')

/** `types.ts` расширений: стандартных — в движке, своих — у коллекций компонентов. */
const EXTENSION_TYPES =
	/[\\/](engine[\\/]extension|collection[\\/]extensions)[\\/](.+[\\/])?types\.ts$/

const EXTENSION_INTERFACE = /^I\w*Extension$/

type TExtensionInterface = {
	name: string
	location: string
	/** Сколько аргументов передано `IExtension` в `extends`. */
	typeArguments: number
}

function collectSourceFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) {
			collectSourceFiles(full, files)
		} else if (/\.ts$/.test(name)) {
			files.push(full)
		}
	}

	return files
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

/** Экспортируемые `I*Extension`, у которых в `extends` стоит `IExtension`. */
function extensionInterfaces(file: string): TExtensionInterface[] {
	const source = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest)
	const found: TExtensionInterface[] = []

	for (const statement of source.statements) {
		if (!ts.isInterfaceDeclaration(statement)) continue
		if (!EXTENSION_INTERFACE.test(statement.name.text)) continue
		if (!statement.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)) continue

		for (const clause of statement.heritageClauses ?? []) {
			for (const heritage of clause.types) {
				if (!ts.isIdentifier(heritage.expression)) continue
				if (heritage.expression.text !== 'IExtension') continue

				const line =
					source.getLineAndCharacterOfPosition(heritage.getStart(source)).line + 1

				found.push({
					name: statement.name.text,
					location: `${toRelative(file)}:${line}`,
					typeArguments: heritage.typeArguments?.length ?? 0,
				})
			}
		}
	}

	return found
}

// Негативные случаи ловит не vitest, а «Типы — Core»: tsc проверяет и
// __tests__, а неиспользованный @ts-expect-error — тоже ошибка. Открытая карта
// у интерфейса уронит типы, а не пройдёт молча.
describe('карта событий расширения видна через тип интерфейса', () => {
	it('ITabsExtension: имя вне карты не подписать и не пробросить', () => {
		const parent: ITabsExtension = new TTabsExtension({ owner: new TTabs() })
		const item = new TEvented<TTabsItemEventsExtension>()
		const closable = vi.fn()

		// @ts-expect-error — `change:view` в карте табов нет
		parent.events.on('change:view', () => {})
		// @ts-expect-error — `destroy` объявлен у item-адаптера, но не у расширения
		item.relay(parent.events, ['destroy'])

		item.on('change:closable', closable)
		item.relay(parent.events, ['change:closable'])
		parent.events.emit('change:closable', true)

		expect(closable).toHaveBeenCalledTimes(1)
	})

	it('ISelectExtension: имя вне карты не подписать и не пробросить', () => {
		const parent: ISelectExtension = new TSelectExtension({ owner: new TSelect() })
		const item = new TEvented<TSelectItemEventsExtension>()
		const indicator = vi.fn()

		// @ts-expect-error — `change:view` в карте Select нет
		parent.events.on('change:view', () => {})
		// @ts-expect-error — `destroy` объявлен у item-адаптера, но не у расширения
		item.relay(parent.events, ['destroy'])

		item.on('change:indicator', indicator)
		item.relay(parent.events, ['change:indicator'])
		parent.events.emit('change:indicator', 'end')

		expect(indicator).toHaveBeenCalledWith('end')
	})

	it('TNoEvents: в пустой карте нет ни одного имени', () => {
		const source = new TEvented<TNoEvents>()
		const target = new TEvented<{ ping: () => void }>()

		// @ts-expect-error — подписываться не на что
		source.on('ping', () => {})
		// @ts-expect-error — пробрасывать нечего; с `Record<string, never>` вызов компилировался
		target.relay(source, ['ping'])
	})
})

describe('extension events map guard', () => {
	it('каждый I*Extension передаёт карту событий вторым аргументом IExtension', () => {
		const interfaces = collectSourceFiles(COMPONENTS_DIR)
			.filter((file) => EXTENSION_TYPES.test(file))
			.flatMap(extensionInterfaces)

		expect(
			interfaces.some(({ location }) => location.includes('/engine/extension/')),
			'не найдено ни одного стандартного расширения — сломан поиск',
		).toBe(true)
		expect(
			interfaces.some(({ location }) => location.includes('/collection/extensions/')),
			'не найдено ни одного расширения коллекции компонента — сломан поиск',
		).toBe(true)

		const violations = interfaces
			.filter(({ typeArguments }) => typeArguments !== 2)
			.map(({ name, location }) => `${location} — ${name}: у IExtension нет карты событий`)

		expect(
			violations,
			`Карта событий расширения не передана вторым аргументом IExtension (см. AGENTS.md,` +
				` "Карта событий выводится из источника, а не переписывается"):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
