import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { findMissingEntries, findUndeclaredImports, isScannedFile } from '../published-imports'
import type { TManifest, TUndeclaredImport } from '../published-imports'

/**
 * Сторож раздела «Версии пакетов» (AGENTS.md): каждый пакет воркспейса, который
 * уезжает в npm, объявляет всё, что импортирует. Правило — в
 * `published-imports.ts`, здесь — собранный воркспейс.
 *
 * Пакеты и состав тарболлов называет сам npm: `npm query .workspace` — где
 * лежит пакет, `npm pack --dry-run` — что из него уедет. Своего списка пакетов
 * и своего разбора `files` здесь нет: новый пакет попадает под проверку сам, а
 * файл, который в тарболл не уедет, не проверяется. Не уезжает в npm пакет с
 * `private` — стенд. Тексты файлов читаются с диска.
 *
 * Читается выход сборки, поэтому проверка идёт после `npm run build` — шагом
 * CI «Импорты пакетов объявлены», а не в `__tests__` пакетов: шаг «Тесты» идёт
 * до сборки. Несобранный пакет не проходит: точек входа нет в его тарболле.
 */

const ROOT = resolve(__dirname, '../../..')

function isObject(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Вывод команды npm, разобранный как JSON. Через оболочку: на Windows npm — это
 * `npm.cmd`, а пакетный файл Node без оболочки не запускает (EINVAL). Команда —
 * постоянная строка, подставлять и экранировать в ней нечего.
 */
function npm(command: string): unknown {
	const output = execSync(`npm ${command}`, {
		cwd: ROOT,
		encoding: 'utf-8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: ['ignore', 'pipe', 'pipe'],
	})

	return JSON.parse(output)
}

function readManifest(dir: string): TManifest {
	const parsed: unknown = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf-8'))

	if (!isObject(parsed)) {
		throw new Error(`${dir}/package.json: ожидается объект JSON`)
	}

	return parsed
}

/** Пути воркспейсов от корня репозитория по имени пакета — как их видит npm. */
function readLocations(): Map<string, string> {
	const listed = npm('query .workspace')

	if (!Array.isArray(listed)) {
		throw new Error('npm query .workspace: ожидается массив воркспейсов')
	}

	return new Map(
		listed.map((entry: unknown): [string, string] => {
			if (!isObject(entry) || typeof entry.name !== 'string') {
				throw new Error('npm query .workspace: воркспейс без имени')
			}

			if (typeof entry.location !== 'string') {
				throw new Error(`npm query .workspace: у ${entry.name} нет location`)
			}

			return [entry.name, entry.location]
		}),
	)
}

/** Пакет, который уезжает в npm: где лежит, его манифест и состав тарболла. */
type TPublished = {
	readonly name: string
	/** Путь пакета от корня репозитория. */
	readonly dir: string
	readonly manifest: TManifest
	/** Файлы тарболла: пути от корня пакета через `/`. */
	readonly paths: readonly string[]
}

/** Пути файлов тарболла из записи `npm pack --json`. */
function tarballPaths(name: string, files: unknown): string[] {
	if (!Array.isArray(files)) {
		throw new Error(`npm pack: у ${name} нет списка files`)
	}

	return files.map((file: unknown) => {
		if (!isObject(file) || typeof file.path !== 'string') {
			throw new Error(`npm pack: у ${name} файл без path`)
		}

		return file.path
	})
}

/** Пакеты воркспейса, которые уезжают в npm, с составом их тарболлов. */
function readPublished(): TPublished[] {
	const locations = readLocations()
	const packed = npm('pack --dry-run --json --workspaces --ignore-scripts')

	if (!Array.isArray(packed)) {
		throw new Error('npm pack: ожидается массив тарболлов')
	}

	return packed
		.map((entry: unknown): TPublished => {
			if (!isObject(entry) || typeof entry.name !== 'string') {
				throw new Error('npm pack: тарболл без имени пакета')
			}

			const dir = locations.get(entry.name)

			if (dir === undefined) {
				throw new Error(`npm pack: ${entry.name} нет среди воркспейсов npm query`)
			}

			return {
				name: entry.name,
				dir,
				manifest: readManifest(dir),
				paths: tarballPaths(entry.name, entry.files),
			}
		})
		.filter(({ manifest }) => manifest.private !== true)
}

function describeImport({ file, specifier, name }: TUndeclaredImport): string {
	return `${file} импортирует "${specifier}": ${name} нет ни в dependencies, ни в peerDependencies`
}

const published = readPublished()

describe('опубликованные пакеты объявляют всё, что импортируют', () => {
	it('воркспейс выкладывает пакеты', () => {
		expect(published.map(({ name }) => name)).not.toEqual([])
	})

	it.each(published)('$name: точки входа — в тарболле (пакет собран)', ({ manifest, paths }) => {
		expect(findMissingEntries(manifest, paths), 'запусти npm run build').toEqual([])
	})

	it.each(published)('$name: импорты объявлены', ({ dir, manifest, paths }) => {
		const files = paths
			.filter(isScannedFile)
			.map((path) => ({ path, text: readFileSync(join(ROOT, dir, path), 'utf-8') }))

		expect(findUndeclaredImports(manifest, files).map(describeImport)).toEqual([])
	})
})
