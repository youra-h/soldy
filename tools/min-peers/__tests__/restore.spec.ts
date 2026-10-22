import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pinTree, restoreRoot, saveRoot, SAVED_DIR } from '../min-peers.ts'

/**
 * Копия манифеста и lock корня, которую `pin` сохраняет до подмены, и возврат
 * из неё (`restore`) — на каталоге с этими двумя файлами. npm не нужен:
 * дерево к возвращённым файлам приводит `npm install`, его зовёт `cli.ts`.
 */

/**
 * Оригиналы не в той форме, в какой манифест пишет подмена (`JSON.stringify`
 * с двумя пробелами): переводы строк CRLF, табы, кириллица, без перевода
 * строки в конце, — чтобы «байт в байт» не совпало случайно.
 */
const MANIFEST = '{\r\n\t"name": "fixture",\r\n\t"description": "оригинал"\r\n}'
const LOCK = '{\n    "name": "fixture",\n    "lockfileVersion": 3\n}\n'

/** Весь каталог фикстуры, когда копии в нём нет. */
const FIXTURE_FILES = ['package-lock.json', 'package.json']

let root = ''

/** Файл корня фикстуры — текстом: так расхождение видно в отчёте строкой, а не байтами. */
function read(file: string): string {
	return readFileSync(join(root, file), 'utf-8')
}

/** Манифест и lock такими, какими их оставила бы подмена. */
function writePinned(): void {
	writeFileSync(join(root, 'package.json'), '{\n  "overrides": { "vue": "3.5.21" }\n}\n')
	writeFileSync(join(root, 'package-lock.json'), '{\n  "lockfileVersion": 3\n}\n')
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'min-peers-restore-'))
	writeFileSync(join(root, 'package.json'), MANIFEST)
	writeFileSync(join(root, 'package-lock.json'), LOCK)
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('копия корня и возврат', () => {
	it('возврат — манифест и lock байт в байт, копии нет', () => {
		saveRoot(root)
		writePinned()
		restoreRoot(root)

		expect(read('package.json')).toBe(MANIFEST)
		expect(read('package-lock.json')).toBe(LOCK)
		expect(readdirSync(root).sort()).toEqual(FIXTURE_FILES)
	})

	it('повторное сохранение — ошибка: файлы корня и копия целы', () => {
		saveRoot(root)
		writePinned()

		const manifest = read('package.json')
		const lock = read('package-lock.json')

		expect(() => saveRoot(root)).toThrow('копия уже есть')
		expect(read('package.json')).toBe(manifest)
		expect(read('package-lock.json')).toBe(lock)

		restoreRoot(root)

		expect(read('package.json')).toBe(MANIFEST)
		expect(read('package-lock.json')).toBe(LOCK)
	})

	it('возврат без копии — ошибка: файлы корня целы', () => {
		writePinned()

		const manifest = read('package.json')
		const lock = read('package-lock.json')

		expect(() => restoreRoot(root)).toThrow('копии нет')
		expect(read('package.json')).toBe(manifest)
		expect(read('package-lock.json')).toBe(lock)
		expect(readdirSync(root).sort()).toEqual(FIXTURE_FILES)
	})

	it('подмена при копии — ошибка до правки манифеста', () => {
		saveRoot(root)

		expect(() => pinTree(root, [{ name: 'vue', version: '3.5.21' }])).toThrow('копия уже есть')
		expect(read('package.json')).toBe(MANIFEST)
	})
})

describe('каталог копии в репозитории', () => {
	const REPO = resolve(import.meta.dirname, '../../..')

	it('в .gitignore: копию не закоммитят вместе с правкой', () => {
		const args = ['check-ignore', '--quiet', `${SAVED_DIR}/package.json`]
		const { status } = spawnSync('git', args, { cwd: REPO })

		expect(status, `${SAVED_DIR}/ нет в .gitignore корня`).toBe(0)
	})
})
