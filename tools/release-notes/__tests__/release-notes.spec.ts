import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import {
	entriesOf,
	INLINE_LIMIT,
	notesOf,
	npmPackages,
	parseSpec,
	releaseOf,
	sharedVersion,
	shortName,
	unpublishedOf,
} from '../release-notes.mjs'

/**
 * What a release publishes and its notes, on fixtures: the library shares one
 * version, a theme or an icon pack has its own (docs/agents/build.md,
 * «Версии пакетов»). The last group reads the packages of the repository.
 */

const ROOT = resolve(import.meta.dirname, '../../..')

const LINKS = 'https://github.com/owner/repo/blob/abc'

/** The library of the fixtures: one `fixed` group. */
const SHARED = new Set(['@soldy-ui/core', '@soldy-ui/vue'])

const CORE_CHANGELOG = [
	'# @soldy-ui/core',
	'',
	'## 0.3.0-alpha.8',
	'',
	'### Minor Changes',
	'',
	'- abc1234: Tabs: `closeable` is renamed to `closable`',
	'  — rename it in your templates',
	'',
	'### Patch Changes',
	'',
	'- def5678: Select: the panel closes on Escape',
	'- Updated dependencies [abc1234]',
	'  - @soldy-ui/plugins@0.3.0-alpha.8',
	'',
	'## 0.3.0-alpha.7',
	'',
	'### Patch Changes',
	'',
	'- 1111111: An older change',
	'',
].join('\n')

/** A changelog with one section: the version and its patch items. */
function changelog(name: string, version: string, items: readonly string[]): string {
	const lines = items.map((text, index) => `- ${String(index).padStart(7, '0')}: ${text}`)

	return [`# ${name}`, '', `## ${version}`, '', '### Patch Changes', '', ...lines, ''].join('\n')
}

/** A published package as `notesOf` reads it. */
function pkg(name: string, version: string, text = '') {
	return { name, version, file: `packages/${shortName(name)}/CHANGELOG.md`, changelog: text }
}

describe('пункты раздела версии', () => {
	it('пункты changeset с продолжением, без строк зависимостей', () => {
		expect(entriesOf(CORE_CHANGELOG, '0.3.0-alpha.8')).toEqual([
			{
				kind: 'Minor Changes',
				text: 'Tabs: `closeable` is renamed to `closable`\n  — rename it in your templates',
			},
			{ kind: 'Patch Changes', text: 'Select: the panel closes on Escape' },
		])
	})

	it('раздел кончается на следующей версии', () => {
		expect(entriesOf(CORE_CHANGELOG, '0.3.0-alpha.7')).toEqual([
			{ kind: 'Patch Changes', text: 'An older change' },
		])
	})

	it('раздела версии нет — пунктов нет', () => {
		expect(entriesOf(CORE_CHANGELOG, '0.3.0-alpha.9')).toEqual([])
	})

	it('раздел из одних зависимостей — пунктов нет', () => {
		const text = [
			'## 0.3.1',
			'',
			'### Patch Changes',
			'',
			'- Updated dependencies [abc1234]',
			'  - @soldy-ui/theme-base@0.3.1',
		].join('\n')

		expect(entriesOf(text, '0.3.1')).toEqual([])
	})
})

describe('имя и версия пакета', () => {
	it('@ скоупа — не разделитель', () => {
		expect(parseSpec('@soldy-ui/core@0.3.0-alpha.8')).toEqual({
			name: '@soldy-ui/core',
			version: '0.3.0-alpha.8',
		})
		expect(shortName('@soldy-ui/theme-oren')).toBe('theme-oren')
	})

	it.each(['@soldy-ui/core', '@soldy-ui/core@', 'core'])('«%s» — ошибка', (spec) => {
		expect(() => parseSpec(spec)).toThrow('expected <name>@<version>')
	})
})

describe('что не опубликовано', () => {
	it('пакет, версии которого в npm нет, — в списке', () => {
		const npm = new Map([
			['@soldy-ui/core@0.3.0-alpha.8', '0.3.0-alpha.8'],
			['@soldy-ui/theme-oren@0.3.1', undefined],
		])
		const packages = [
			{ name: '@soldy-ui/core', version: '0.3.0-alpha.8' },
			{ name: '@soldy-ui/theme-oren', version: '0.3.1' },
		]

		expect(unpublishedOf(packages, (spec: string) => npm.get(spec))).toEqual([
			{ name: '@soldy-ui/theme-oren', version: '0.3.1' },
		])
	})
})

describe('GitHub Release выпуска', () => {
	it('с библиотекой — её версией, тема с другой версией его не меняет', () => {
		const published = [
			{ name: '@soldy-ui/core', version: '0.3.0-alpha.8' },
			{ name: '@soldy-ui/theme-oren', version: '0.3.0-alpha.11' },
			{ name: '@soldy-ui/vue', version: '0.3.0-alpha.8' },
		]

		expect(releaseOf(published, SHARED)).toEqual({
			tag: 'v0.3.0-alpha.8',
			title: 'v0.3.0-alpha.8',
			prerelease: true,
		})
	})

	it('без библиотеки — на теге первого пакета, в заголовке все пакеты', () => {
		const published = [
			{ name: '@soldy-ui/theme-oren', version: '0.4.2' },
			{ name: '@soldy-ui/theme-base', version: '0.4.1' },
		]

		expect(releaseOf(published, SHARED)).toEqual({
			tag: '@soldy-ui/theme-base@0.4.1',
			title: 'theme-base@0.4.1, theme-oren@0.4.2',
			prerelease: false,
		})
	})

	it('суффикс у любой версии — предварительный выпуск', () => {
		const published = [
			{ name: '@soldy-ui/core', version: '1.2.0' },
			{ name: '@soldy-ui/icons-lucide', version: '1.1.0-beta.0' },
		]

		expect(releaseOf(published, SHARED).prerelease).toBe(true)
	})

	it('библиотека двумя версиями — ошибка', () => {
		const published = [
			{ name: '@soldy-ui/core', version: '0.3.0-alpha.8' },
			{ name: '@soldy-ui/vue', version: '0.3.0-alpha.9' },
		]

		expect(() => releaseOf(published, SHARED)).toThrow('more than one version')
	})

	it('не опубликовано ничего — ошибка', () => {
		expect(() => releaseOf([], SHARED)).toThrow('nothing was published')
	})
})

describe('заметки выпуска', () => {
	it('пункт — один раз, с пакетами; тема — со своей версией', () => {
		const shared = 'Tags: the close button is keyboard-reachable'
		const packages = [
			pkg(
				'@soldy-ui/core',
				'0.3.0-alpha.8',
				changelog('@soldy-ui/core', '0.3.0-alpha.8', [shared]),
			),
			pkg(
				'@soldy-ui/theme-oren',
				'0.3.0-alpha.11',
				changelog('@soldy-ui/theme-oren', '0.3.0-alpha.11', [
					shared,
					'Tags: a calmer focus ring',
				]),
			),
			pkg('@soldy-ui/vue', '0.3.0-alpha.8', changelog('@soldy-ui/vue', '0.3.0-alpha.8', [])),
		]

		expect(notesOf(packages, SHARED, LINKS)).toBe(
			[
				'### Patch Changes',
				'',
				`- ${shared} (\`@soldy-ui/core\`, \`@soldy-ui/theme-oren@0.3.0-alpha.11\`)`,
				'- Tags: a calmer focus ring (`@soldy-ui/theme-oren@0.3.0-alpha.11`)',
				'',
			].join('\n'),
		)
	})

	// The theme once released a version equal to the one the library gets now
	it('пункты читаются по своей версии пакета, а не по версии библиотеки', () => {
		const oren = [
			'# @soldy-ui/theme-oren',
			'',
			'## 0.3.0-alpha.12',
			'',
			'### Patch Changes',
			'',
			'- 2222222: Released now',
			'',
			'## 0.3.0-alpha.9',
			'',
			'### Patch Changes',
			'',
			'- 1111111: Released earlier',
			'',
		].join('\n')
		const packages = [
			pkg(
				'@soldy-ui/core',
				'0.3.0-alpha.9',
				changelog('@soldy-ui/core', '0.3.0-alpha.9', ['A fix']),
			),
			pkg('@soldy-ui/theme-oren', '0.3.0-alpha.12', oren),
		]
		const notes = notesOf(packages, SHARED, LINKS)

		expect(notes).toContain('- Released now (`@soldy-ui/theme-oren@0.3.0-alpha.12`)')
		expect(notes).not.toContain('Released earlier')
	})

	it('тема без своих пунктов — последней строкой, пакет библиотеки — нет', () => {
		const packages = [
			pkg(
				'@soldy-ui/core',
				'0.3.0-alpha.8',
				changelog('@soldy-ui/core', '0.3.0-alpha.8', ['A fix']),
			),
			pkg('@soldy-ui/vue', '0.3.0-alpha.8', changelog('@soldy-ui/vue', '0.3.0-alpha.8', [])),
			pkg('@soldy-ui/theme-oren', '0.3.1', changelog('@soldy-ui/theme-oren', '0.3.1', [])),
		]
		const notes = notesOf(packages, SHARED, LINKS)

		expect(notes).toBe(
			[
				'### Patch Changes',
				'',
				'- A fix (`@soldy-ui/core`)',
				'',
				'Published with updated dependencies only: `@soldy-ui/theme-oren@0.3.1`.',
				'',
			].join('\n'),
		)
	})

	it('пунктов больше предела — ссылки на changelog пакетов с пунктами', () => {
		const many = Array.from({ length: INLINE_LIMIT + 1 }, (_, index) => `Change ${index}`)
		const packages = [
			pkg(
				'@soldy-ui/core',
				'0.3.0-alpha.8',
				changelog('@soldy-ui/core', '0.3.0-alpha.8', many),
			),
			pkg('@soldy-ui/vue', '0.3.0-alpha.8', changelog('@soldy-ui/vue', '0.3.0-alpha.8', [])),
			pkg(
				'@soldy-ui/theme-oren',
				'0.3.1',
				changelog('@soldy-ui/theme-oren', '0.3.1', ['A look']),
			),
		]

		expect(notesOf(packages, SHARED, LINKS)).toBe(
			[
				'What changed is in the changelogs of the packages:',
				'',
				`- [@soldy-ui/core](${LINKS}/packages/core/CHANGELOG.md)`,
				`- [@soldy-ui/theme-oren@0.3.1](${LINKS}/packages/theme-oren/CHANGELOG.md)`,
				'',
			].join('\n'),
		)
	})

	it('пунктов нет ни у кого — так и сказано', () => {
		const packages = [
			pkg(
				'@soldy-ui/core',
				'0.3.0-alpha.8',
				CORE_CHANGELOG.replace(/- [0-9a-f]{7}: .*/g, ''),
			),
		]

		expect(notesOf(packages, SHARED, LINKS)).toBe('No changes in the packages.\n')
	})
})

describe('пакеты репозитория', () => {
	const packages = npmPackages(ROOT)
	const names = packages.map(({ name }) => name)

	it('в npm уходят библиотека, темы и иконки, стенд — нет', () => {
		expect(names).toEqual(
			expect.arrayContaining([
				'@soldy-ui/core',
				'@soldy-ui/vue',
				'@soldy-ui/theme-base',
				'@soldy-ui/theme-oren',
				'@soldy-ui/icons-lucide',
				'@soldy-ui/icons-material',
			]),
		)
		expect(names.filter((name) => name.startsWith('@soldy-ui/playground'))).toEqual([])
	})

	it('группа общей версии — пакеты, которые уходят в npm', () => {
		const shared = [...sharedVersion(ROOT)]

		expect(shared.length).toBeGreaterThan(0)
		expect(names).toEqual(expect.arrayContaining(shared))
	})

	it('темы и иконки — вне группы общей версии', () => {
		const shared = sharedVersion(ROOT)
		const own = packages.filter(({ dir }) => /^packages\/(themes|icons)\//.test(dir))

		expect(own.length).toBeGreaterThan(0)
		expect(own.filter(({ name }) => shared.has(name))).toEqual([])
	})
})
