const callyElementNames = new Set([
  "calendar-ctx",
  "calendar-month",
  "calendar-date",
  "calendar-select-year",
  "calendar-select-month",
  "calendar-range",
  "calendar-multi",
]);

type GuardedDefine = CustomElementRegistry["define"] & {
  __siyuanPledgerCallyGuarded__?: boolean;
};

const registry = window.customElements;
const currentDefine = registry.define as GuardedDefine;

if (!currentDefine.__siyuanPledgerCallyGuarded__) {
  const previousDefine = registry.define;
  const guardedDefine: GuardedDefine = function (name, constructor, options) {
    // 插件重载时只跳过 cally 已注册的元素，不改变其他自定义元素的注册行为。
    if (callyElementNames.has(name) && registry.get(name)) return;
    return previousDefine.call(registry, name, constructor, options);
  };

  Object.defineProperty(guardedDefine, "__siyuanPledgerCallyGuarded__", {
    value: true,
  });
  registry.define = guardedDefine;
}
