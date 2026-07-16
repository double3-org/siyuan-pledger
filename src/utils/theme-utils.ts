export interface PluginThemeColors {
  background: string;
  border: string;
  text: string;
  textSecondary: string;
}

/**
 * Canvas 图表无法直接使用 CSS 变量，因此在渲染时读取思源当前主题颜色。
 */
export function getPluginThemeColors(): PluginThemeColors {
  const styles = getComputedStyle(document.documentElement);
  const getColor = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  return {
    background: getColor("--b3-theme-background", "#fff"),
    border: getColor("--b3-border-color", "#e5e7eb"),
    text: getColor("--b3-theme-on-background", "#111827"),
    textSecondary: getColor("--b3-theme-on-surface", "#64748b"),
  };
}

/**
 * 思源切换模式或主题包后重新渲染图表，并返回清理函数。
 */
export function observeThemeChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme-mode", "data-light-theme", "data-dark-theme"],
  });
  return () => observer.disconnect();
}
