import { describe, it, expect } from 'vitest'
import { lowerBound, pinsOf, strayCopies } from '../min-peers.ts'
import type { TCopy, TManifest } from '../min-peers.ts'

/**
 * Правила списка подмены и проверки дерева — на фикстурах: что попадает в
 * список, какой версией и что считается копией не той версии. Настоящие
 * адаптеры и матрицу CI проверяет `workspace.spec.ts`, дерево, которое
 * называет npm, — `tree.spec.ts`.
 */

function copy(location: string, manifest: TManifest): TCopy {
	return { location, manifest }
}

describe('нижняя граница диапазона', () => {
	it.each([
		['^22.2.0', '22.2.0'],
		['~3.5.21', '3.5.21'],
		['>=1.9.16', '1.9.16'],
		['5.55.10 - 5.57', '5.55.10'],
		['^19.2.0 || ^18.3.1', '18.3.1'],
	])('%s → %s', (range, version) => {
		expect(lowerBound(range)).toBe(version)
	})

	it.each([
		['без нижней границы', '*'],
		['от нуля', '>=0.0.0'],
		['без подходящей версии', '>1.0.0 <1.0.0'],
		['не диапазон', 'workspace:*'],
	])('%s (%s) — ошибка', (_title, range) => {
		expect(() => lowerBound(range)).toThrow(`диапазон «${range}»: нижней границы нет`)
	})
})

describe('список подмены', () => {
	it('peer — нижней границей своего диапазона', () => {
		expect(
			pinsOf({ peerDependencies: { react: '^19.2.0', 'react-dom': '^19.2.0' } }, []),
		).toEqual([
			{ name: 'react', version: '19.2.0' },
			{ name: 'react-dom', version: '19.2.0' },
		])
	})

	it('у peer «a || b» — меньшая граница', () => {
		expect(pinsOf({ peerDependencies: { '@angular/core': '^22.2.0 || ^21.1.0' } }, [])).toEqual(
			[{ name: '@angular/core', version: '21.1.0' }],
		)
	})

	it('devDependency с диапазоном peer — в списке, с другим диапазоном — нет', () => {
		const manifest: TManifest = {
			peerDependencies: { '@angular/core': '^22.2.0' },
			devDependencies: {
				'@angular/compiler-cli': '^22.2.0',
				'@angular/build': '^22.2.1',
				'ng-packagr': '^22.1.1',
			},
		}

		expect(pinsOf(manifest, [])).toEqual([
			{ name: '@angular/compiler-cli', version: '22.2.0' },
			{ name: '@angular/core', version: '22.2.0' },
		])
	})

	it('peer и devDependency с другим диапазоном — нижней границей peer', () => {
		const manifest: TManifest = {
			peerDependencies: { vue: '^3.5.21' },
			devDependencies: { vue: '^3.5.32' },
		}

		expect(pinsOf(manifest, [])).toEqual([{ name: 'vue', version: '3.5.21' }])
	})

	it('пакет выпуска — зависимость, которую пакет держит ровно своей версией, и вглубь', () => {
		const tree = [
			copy('node_modules/vue', {
				name: 'vue',
				version: '3.5.44',
				dependencies: { '@vue/runtime-dom': '3.5.44', '@vue/shared': '3.5.44' },
				peerDependencies: { typescript: '*' },
			}),
			copy('node_modules/@vue/runtime-dom', {
				name: '@vue/runtime-dom',
				version: '3.5.44',
				dependencies: { '@vue/runtime-core': '3.5.44', csstype: '^3.1.3' },
			}),
			copy('node_modules/@vue/runtime-core', {
				name: '@vue/runtime-core',
				version: '3.5.44',
			}),
			copy('node_modules/@vue/shared', { name: '@vue/shared', version: '3.5.44' }),
			copy('node_modules/csstype', { name: 'csstype', version: '3.1.3' }),
		]

		expect(pinsOf({ peerDependencies: { vue: '^3.5.21' } }, tree)).toEqual([
			{ name: '@vue/runtime-core', version: '3.5.21' },
			{ name: '@vue/runtime-dom', version: '3.5.21' },
			{ name: '@vue/shared', version: '3.5.21' },
			{ name: 'vue', version: '3.5.21' },
		])
	})

	it('пакет выпуска — и по peer, который пакет держит ровно своей версией', () => {
		const tree = [
			copy('node_modules/@angular/core', {
				name: '@angular/core',
				version: '22.2.3',
				peerDependencies: { '@angular/compiler': '22.2.3', rxjs: '^7.4.0' },
			}),
		]

		expect(pinsOf({ peerDependencies: { '@angular/core': '^22.2.0' } }, tree)).toEqual([
			{ name: '@angular/compiler', version: '22.2.0' },
			{ name: '@angular/core', version: '22.2.0' },
		])
	})

	it('пакету — две разные нижние границы: ошибка', () => {
		const tree = [
			copy('node_modules/react-dom', {
				name: 'react-dom',
				version: '19.3.1',
				peerDependencies: { react: '19.3.1' },
			}),
		]
		const manifest: TManifest = {
			peerDependencies: { react: '^19.2.0', 'react-dom': '^19.1.0' },
		}

		expect(() => pinsOf(manifest, tree)).toThrow('react: две нижние границы — 19.2.0 и 19.1.0')
	})

	it('peer нет — список пуст', () => {
		expect(pinsOf({ devDependencies: { vue: '^3.5.32' } }, [])).toEqual([])
	})
})

describe('проверка дерева', () => {
	const pins = [{ name: 'vue', version: '3.5.21' }]

	it('все копии — версии списка: расхождений нет', () => {
		const tree = [
			copy('node_modules/vue', { name: 'vue', version: '3.5.21' }),
			copy('packages/ui/vue/node_modules/vue', { name: 'vue', version: '3.5.21' }),
		]

		expect(strayCopies(pins, tree)).toEqual([])
	})

	it('копия другой версии — расхождение с её местом, где бы она ни лежала', () => {
		const tree = [
			copy('node_modules/vue', { name: 'vue', version: '3.5.21' }),
			copy('packages/ui/vue/node_modules/vue', { name: 'vue', version: '3.5.44' }),
		]

		expect(strayCopies(pins, tree)).toEqual([
			{
				name: 'vue',
				expected: '3.5.21',
				found: { version: '3.5.44', location: 'packages/ui/vue/node_modules/vue' },
			},
		])
	})

	it('пакета нет в дереве — расхождение', () => {
		expect(
			strayCopies(pins, [copy('node_modules/react', { name: 'react', version: '19.2.0' })]),
		).toEqual([{ name: 'vue', expected: '3.5.21' }])
	})
})
