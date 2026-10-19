/**
 * Сенсорное устройство Apple — iPhone, iPod или iPad. iPadOS называет себя
 * `MacIntel`, как Mac, и отличает его сенсорный экран: у Mac точек касания нет.
 *
 * Общее у полей, которым VoiceOver на iOS не даёт счётчик (`spinbutton`): там
 * он его не фокусирует, и поле даты и поле числа отдают роль `textbox`.
 * Устройство узнают у документа узла, а не у `globalThis`: поле живёт и в
 * iframe.
 */
export function isAppleTouch(navigator: Navigator | undefined): boolean {
	if (!navigator) return false

	const { platform, maxTouchPoints } = navigator

	return /^(iPhone|iPod|iPad)/.test(platform) || (/^Mac/.test(platform) && maxTouchPoints > 1)
}
