// Code comments are written in English (AGENTS.md, «Комментарии, коммиты и
// CHANGELOG — на английском»). The translation is gradual: only comments on
// lines added or changed since <base> are checked, the rest wait for their edit.
//
// node tools/english/comments.mjs <base>
//
// The scanner is line-based on purpose: strings are closed at the end of the
// line (template literals excepted), so a quote it misreads — inside a regular
// expression, an apostrophe in template text — spoils one line, not the file.
// Block comments do span lines, so a changed line in the middle of a Russian
// block is caught too.
//
// Text in «guillemets» is skipped: it is the title of a section in the Russian
// docs, the way the repository cites them, and may wrap to the next line.

import { execFileSync } from 'node:child_process'
import { extname } from 'node:path'

const base = process.argv[2]
if (!base) {
	console.error('usage: comments.mjs <base>')
	process.exit(1)
}

const SYNTAX = {
	'.ts': { line: '//', block: true },
	'.tsx': { line: '//', block: true },
	'.mts': { line: '//', block: true },
	'.cts': { line: '//', block: true },
	'.js': { line: '//', block: true },
	'.jsx': { line: '//', block: true },
	'.mjs': { line: '//', block: true },
	'.cjs': { line: '//', block: true },
	'.scss': { line: '//', block: true },
	'.css': { block: true },
	'.vue': { line: '//', block: true, html: true },
	'.svelte': { line: '//', block: true, html: true },
	'.html': { block: true, html: true },
	'.yml': { hash: true },
	'.yaml': { hash: true },
}

const cyrillic = /[Ѐ-ӿ]/

function git(...args) {
	return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 })
}

// Added line numbers of each changed file, from a zero-context diff.
function addedLines() {
	const diff = git(
		'diff',
		'--unified=0',
		'--no-color',
		'--no-renames',
		'--diff-filter=AM',
		`${base}...HEAD`,
	)
	const files = new Map()
	let lines = null
	for (const row of diff.split('\n')) {
		const file = /^\+\+\+ b\/(.+)$/.exec(row)
		if (file) {
			lines = SYNTAX[extname(file[1])] ? new Set() : null
			if (lines) files.set(file[1], lines)
			continue
		}
		const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(row)
		if (hunk && lines) {
			const start = Number(hunk[1])
			const count = hunk[2] === undefined ? 1 : Number(hunk[2])
			for (let n = start; n < start + count; n++) lines.add(n)
		}
	}
	return files
}

// Comment text per line (1-based) of a file.
function commentsOf(source, syntax) {
	const result = []
	let state = 'code' // code | block | html | template
	source.split(/\r?\n/).forEach((text, index) => {
		let comment = ''
		let quote = null
		if (state === 'template') quote = '`'
		for (let i = 0; i < text.length; i++) {
			const rest = text.slice(i)
			if (state === 'block') {
				if (rest.startsWith('*/')) {
					state = 'code'
					i++
				} else comment += text[i]
				continue
			}
			if (state === 'html') {
				if (rest.startsWith('-->')) {
					state = 'code'
					i += 2
				} else comment += text[i]
				continue
			}
			if (quote) {
				if (text[i] === '\\') i++
				else if (text[i] === quote) {
					quote = null
					state = 'code'
				}
				continue
			}
			if (syntax.line && rest.startsWith(syntax.line)) {
				comment += rest
				break
			}
			if (syntax.hash && text[i] === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
				comment += rest
				break
			}
			if (syntax.block && rest.startsWith('/*')) {
				state = 'block'
				i++
				continue
			}
			if (syntax.html && rest.startsWith('<!--')) {
				state = 'html'
				i += 3
				continue
			}
			if (text[i] === "'" || text[i] === '"' || text[i] === '`') quote = text[i]
		}
		if (quote === '`') state = 'template'
		else if (state === 'template') state = 'code'
		result[index + 1] = comment
	})
	return result
}

// Comment text without «section titles». A title runs over comment lines
// only: a line without a comment ends it.
function withoutTitles(comments) {
	let title = false
	return comments.map((comment = '') => {
		if (!comment) title = false
		let text = ''
		for (const char of comment) {
			if (char === '«') title = true
			else if (char === '»') title = false
			else if (!title) text += char
		}
		return text
	})
}

const offenders = []
for (const [file, lines] of addedLines()) {
	const comments = commentsOf(git('show', `HEAD:${file}`), SYNTAX[extname(file)])
	const checked = withoutTitles(comments)
	for (const n of [...lines].sort((a, b) => a - b)) {
		if (cyrillic.test(checked[n] ?? '')) offenders.push(`  ${file}:${n}: ${comments[n].trim()}`)
	}
}

if (offenders.length > 0) {
	console.error(
		'Code comments are written in English; translate these added or changed comment lines:',
	)
	for (const line of offenders) console.error(line)
	process.exit(1)
}
