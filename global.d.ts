export {};

declare global {
  interface Window {
    PersonalLedgerPlugHandler: PersonalLedgerPlug;
  }

  interface SettingConfig {
    documentId: string; // 账本所在文档 ID
    config: string; // 账本配置内容
  }

  interface LedgerItem {
    name: string; // 名称, 中文
    amount: number; // 总金额
    icon?: string; // 图标名称, 需要在 siyuan 中注册
    time?: string; // 记录时间
    children?: LedgerItem[]; // 子项
  }
}
