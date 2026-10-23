import { TTeleport } from './teleport'

/**
 * Содержимое ли узел света: элемент, якорь увезённого корня или текст не из
 * одних пробелов. Слот без содержимого не задан — пробелы вокруг
 * `<svg slot="leading">` не глушат проп `text`, как и у компилятора Vue.
 */
export function isContent(node: Node): boolean {
	if (node instanceof Element || TTeleport.rootAt(node)) return true

	return node instanceof Text && node.data.trim() !== ''
}
