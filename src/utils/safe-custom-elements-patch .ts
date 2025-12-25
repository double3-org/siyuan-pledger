/**
 * 防止自定义元素重复注册导致的错误, 只允许同名 CustomElement 被注册一次
 * 某些第三方库（如 cally）在多次加载时会尝试重复注册自定义元素，导致错误
 * 需要在顶端调用
 */
(() => {
  // 防止 patch 被重复执行
  const w = window as any;
  if (w.__CUSTOM_ELEMENTS_DEFINE_GUARDED__) return;
  w.__CUSTOM_ELEMENTS_DEFINE_GUARDED__ = true;

  const registry = window.customElements;
  // 保存原始 define 方法，并绑定正确的 this
  const originalDefine = registry.define.bind(registry);

  registry.define = function (
    name: string,
    ctor: CustomElementConstructor,
    options?: ElementDefinitionOptions
  ) {
    // 如果 CustomElement 已经存在, 忽略
    if (registry.get(name)) {
      // 关键：直接忽略重复注册
      return;
    }
    // 正常注册
    return originalDefine(name, ctor, options);
  };
})();