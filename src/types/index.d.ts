export {};

declare global {
  interface SettingConfig {
    documentId: string; // 账本所在文档 ID
    config: string; // 账本配置内容
    planNum: string; // 目标金额
    bookkeepingDocumentId: string; // 记账数据存放位置
    bookkeepingStorageMode: string; // 记账数据存放方式
    bookkeepingMonthlyBudget: string; // 记账每月预算
    bookkeepingConfig: string; // 记账配置内容
    iconConfig: string; // 图标配置内容
  }

  interface IconConfigItem {
    name: string; // 图标名称，对应 symbol 的 id
    symbol: string; // 完整的 symbol 标签
  }

  interface LedgerItem {
    name: string; // 名称, 中文
    amount: number; // 总金额
    icon?: string; // 图标名称或 emoji 表情
    time?: string; // 记录时间
    children?: LedgerItem[]; // 子项
  }

  interface BookkeepingRecord {
    type: "expense" | "income"; // 记账类型
    date: string; // 记账日期
    parentName: string; // 一级分类
    childName: string; // 二级分类
    amount: number; // 金额
    remark: string; // 备注
    storageRootId?: string; // 记账配置对应的数据根位置
  }
}
