// vue-dialog-util.ts
import { createApp, type Component } from "vue";
import { Dialog } from "siyuan";

export interface VueDialogOptions {
  title?: string;
  width?: string;
  height?: string;
  props?: Record<string, any>; // 传给 Vue 组件的 props
  isMobile?: boolean; // 是否为移动端
}

export function alert(component: Component, options: VueDialogOptions = {}) {

  const mountId = `lg-dialog--${Date.now()}-${Math.random()}`;
  const isMobile = options.isMobile ?? false;

  const dialog = new Dialog({
    title: options.title ?? "弹窗",
    width:
      options.width ??
      (isMobile ? "100%" : "900px"),
    height:
      options.height ??
      (isMobile ? "100%" : "600px"),
    content: `<div id="${mountId}" style="height:100%; overflow: auto;"></div>`,
  });


  const el = document.getElementById(mountId);
  if (!el) return;

  if (options.props) {
    options.props.onClose = () => dialog.destroy(); // 监听关闭事件，关闭对话框
  }

  const app = createApp(component, {
    ...options.props,
    dialog, // 注入 Dialog 实例，可在组件内部关闭
  });

  app.mount(el);

  // 覆盖 dialog.destroy，确保 Vue 卸载
  const oldDestroy = dialog.destroy.bind(dialog);
  dialog.destroy = () => {
    app.unmount();
    oldDestroy();
  };

  return dialog;
}
