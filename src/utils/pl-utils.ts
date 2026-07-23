import currency from "currency.js";

/**
 * 计算对象的嵌套深度
 * @param value 要计算深度的对象
 * @returns 嵌套深度
 */
function getObjectDepth(value: any): number {
  if (value === null || typeof value !== "object") {
    return 0;
  }

  if (Array.isArray(value)) {
    let max = 0;
    for (const item of value) {
      max = Math.max(max, getObjectDepth(item));
    }
    return max;
  }

  let maxChildDepth = 0;

  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    maxChildDepth = Math.max(maxChildDepth, getObjectDepth(value[key]));
  }

  return 1 + maxChildDepth;
}

/**
 * 将配置转为 markdown table header 例如
 * | time | name1 | name2 | name... | amount | \n |---------|---------|---------|....|---------|
 * @param deep 层级, 可以为空, 如果不传的话取配置的层级, 最深
 */
function config2TableMDHeader(settingConfData: string, depth?: number) {
  let headerMdStr = "";
  // 获取配置层级
  const config = JSON.parse(settingConfData);
  const finalDepth = depth ?? getObjectDepth(config);
  // 根据层级初始化表格 markdown
  let tableHeaderArr: string[] = [];
  tableHeaderArr.push("日期");
  for (let i = 0; i < finalDepth; i++) {
    tableHeaderArr.push("类型" + (i + 1));
  }
  tableHeaderArr.push("金额");
  headerMdStr = "| " + tableHeaderArr.join(" | ") + " |";
  headerMdStr +=
    "\n| " + tableHeaderArr.map(() => "---------").join(" | ") + " |";
  return headerMdStr;
}

/**
 * 将 json 转为 markdown table body
 * @param jsonData 账本项数组
 * @param depth 展开层级（1 = 只展开第一层）
 */
function json2TableMDBody(jsonData: LedgerItem[], depth?: number) {
  const finalDepth = depth ?? getObjectDepth(jsonData);

  /**
   * 递归构建表格行
   * @param item 当前节点
   * @param level 当前层级（从 1 开始）
   * @param path 类型路径
   * @param rows 结果行
   */
  function buildRows(
    item: LedgerItem,
    level: number,
    path: string[],
    rows: string[][]
  ) {
    const currentPath = [...path, item.name];
    // 达到展开层级，直接生成一行
    if (level === finalDepth) {
      const row: string[] = [];
      // 时间
      row.push(item.time || "");
      // 类型列（补齐到 finalDepth）
      for (let i = 0; i < finalDepth; i++) {
        row.push(currentPath[i] || "");
      }
      // 金额：当前层级的 amount
      row.push((item.amount ?? 0).toFixed(2));
      rows.push(row);
      return;
    }

    // 未达到 depth，但没有 children，也要落一行
    if (!item.children || item.children.length === 0) {
      const row: string[] = [];
      row.push(item.time || "");
      for (let i = 0; i < finalDepth; i++) {
        row.push(currentPath[i] || "");
      }
      row.push((item.amount ?? 0).toFixed(2));
      rows.push(row);
      return;
    }

    // 继续向下展开
    for (const child of item.children) {
      buildRows(child, level + 1, currentPath, rows);
    }
  }

  const allRows: string[][] = [];
  for (const ledgerItem of jsonData) {
    buildRows(ledgerItem, 1, [], allRows);
  }
  return allRows
    .map((row) => `| ${row.map(escapeMarkdownTableCell).join(" | ")} |`)
    .join("\n");
}

/**
 * 转义 Markdown 表格单元格，避免用户输入破坏表格结构。
 */
function escapeMarkdownTableCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "\\n");
}

/**
 * 解析一行 Markdown 表格，支持转义后的反斜杠、竖线和换行。
 */
function splitMarkdownTableRow(line: string): string[] {
  const content = line.startsWith("|") && line.endsWith("|")
    ? line.slice(1, -1)
    : line;
  const cells: string[] = [];
  let cell = "";
  let escaped = false;

  for (const char of content) {
    if (escaped) {
      if (char === "n") {
        cell += "\n";
      } else if (char === "|" || char === "\\") {
        cell += char;
      } else {
        cell += `\\${char}`;
      }
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
    } else if (char === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }

  if (escaped) cell += "\\";
  cells.push(cell.trim());
  return cells;
}

/**
 * 将 table md string 转为 json, 第一个表格, 总览部分
 * 按 tableMDStr 的内容来，如果 settingConfData 有对应的 icon, 则补充
 * @param tableMDStr 表格内容
 * @param settingConfData 配置
 */
function tableMD2json(
  tableMDStr: string,
  settingConfData: string
): LedgerItem[] {
  const iconMap = new Map<string, string>();

  try {
    const conf = JSON.parse(settingConfData);
    if (Array.isArray(conf)) {
      for (const item of conf) {
        if (item?.name && item?.icon) {
          iconMap.set(item.name, item.icon);
        }
      }
    }
  } catch {}

  const lines = tableMDStr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (lines.length < 3) return [];

  const headers = lines[0]
    ? splitMarkdownTableRow(lines[0])
    : [];

  const dateIndex = 0;
  const amountIndex = headers.length - 1;
  const depth = amountIndex - 1;

  const rootMap = new Map<string, LedgerItem>();

  function getOrCreateChild(
    parent: LedgerItem | null,
    name: string,
    time: string
  ): LedgerItem {
    if (!parent) {
      const key = `${time}__${name}`;
      let node = rootMap.get(key);
      if (!node) {
        node = {
          time,
          name,
          amount: 0,
          icon: iconMap.get(name),
          children: [],
        };
        rootMap.set(key, node);
      }
      return node;
    }

    parent.children ??= [];
    let node = parent.children.find((c) => c.name === name);
    if (!node) {
      node = {
        name,
        amount: 0,
        icon: iconMap.get(name),
        children: [],
      };
      parent.children.push(node);
    }
    return node;
  }

  function aggregateAmount(node: LedgerItem): number {
    if (!node.children || node.children.length === 0) {
      return node.amount || 0;
    }

    const sum = node.children.reduce((acc, child) => {
      return currency(acc).add(aggregateAmount(child)).value;
    }, 0);

    node.amount = sum;
    return sum;
  }

  for (let i = 2; i < lines.length; i++) {
    const cols = splitMarkdownTableRow(lines[i]);

    const time = cols[dateIndex];
    const amount = parseFloat(cols[amountIndex]) || 0;

    if (!time) continue;

    let parent: LedgerItem | null = null;

    for (let d = 0; d < depth; d++) {
      const name = cols[1 + d];
      if (!name) break;

      const node = getOrCreateChild(parent, name, time);
      parent = node;

      if (d === depth - 1) {
        parent.amount = (parent.amount || 0) + amount;
      }
    }
  }

  const clean = (nodes: LedgerItem[]) => {
    for (const n of nodes) {
      if (n.children && n.children.length === 0) {
        delete n.children;
      } else if (n.children) {
        clean(n.children);
      }
    }
  };

  const result = Array.from(rootMap.values());
  clean(result);

  for (const item of result) {
    aggregateAmount(item);
  }

  return result;
}

/**
 * 深拷贝对象（使用 JSON 序列化方式）
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 清洗用户提供的 SVG symbol，只保留常用绘图元素和安全属性。
 * 不依赖第三方库，避免脚本、事件属性和外部资源进入页面或图标注册表。
 */
function sanitizeSvgSymbol(symbol: string): string {
  const symbolText = symbol.trim().match(/<symbol[\s\S]*?<\/symbol>/i)?.[0] || "";
  if (!symbolText || typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return "";
  }

  const parsed = new DOMParser().parseFromString(symbolText, "image/svg+xml");
  const root = parsed.documentElement;
  if (!root || root.tagName.toLowerCase() !== "symbol" || parsed.querySelector("parsererror")) {
    return "";
  }

  const allowedTags = new Set([
    "g", "path", "circle", "ellipse", "line", "polyline", "polygon", "rect", "use",
    "defs", "clippath", "mask", "lineargradient", "radialgradient", "stop",
  ]);
  const allowedAttributes = new Set([
    "id", "viewbox", "d", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width",
    "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "opacity",
    "transform", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "x2", "y1", "y2",
    "points", "width", "height", "preserveaspectratio", "offset", "stop-color", "stop-opacity",
    "gradientunits", "gradienttransform", "spreadmethod", "patternunits", "clip-path", "mask",
    "href", "xlink:href",
  ]);

  const sanitizeElement = (element: Element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const isSafeReference = ["href", "xlink:href", "clip-path", "mask"].includes(name)
        ? (name === "href" || name === "xlink:href" ? value.startsWith("#") : /^url\(#[^)]+\)$/i.test(value))
        : true;

      if (name.startsWith("on") || !allowedAttributes.has(name) || !isSafeReference) {
        element.removeAttribute(attribute.name);
      }
    }

    for (const child of Array.from(element.children)) {
      if (!allowedTags.has(child.tagName.toLowerCase())) {
        child.remove();
        continue;
      }
      sanitizeElement(child);
    }
  };

  sanitizeElement(root);
  const serialized = new XMLSerializer().serializeToString(root);
  return serialized.startsWith("<symbol") ? serialized : "";
}

/**
 * 校验账本配置文本，限制为当前 UI 支持的两层结构，并检查名称重复。
 */
function validateLedgerConfigText(configText: string, sectionName: string): string {
  try {
    const configList = JSON.parse(configText);
    if (!Array.isArray(configList) || configList.length === 0) {
      return `${sectionName}配置格式无效，请先在插件设置中检查`;
    }

    const parentNames = new Set<string>();
    for (const item of configList) {
      if (
        !item
        || typeof item.name !== "string"
        || !item.name.trim()
        || parentNames.has(item.name.trim())
        || !Array.isArray(item.children)
        || item.children.length === 0
      ) {
        return `${sectionName}配置格式无效，请检查名称、层级和重复项`;
      }
      parentNames.add(item.name.trim());

      const childNames = new Set<string>();
      for (const child of item.children) {
        if (
          !child
          || typeof child.name !== "string"
          || !child.name.trim()
          || childNames.has(child.name.trim())
          || Object.prototype.hasOwnProperty.call(child, "children")
        ) {
          return `${sectionName}配置格式无效，请检查名称、层级和重复项`;
        }
        childNames.add(child.name.trim());
      }
    }
  } catch {
    return `${sectionName}配置格式无效，请先在插件设置中检查`;
  }

  return "";
}

/**
 * 校验设置面板数据，允许资产或记账模块整体留空，但不允许保存半配置或非法值。
 */
function getSettingValidationMessage(setting?: Partial<SettingConfig>): string {
  if (!setting) return "设置数据无效";

  const hasAssetConfig = !!(setting.documentId?.trim() || setting.config?.trim() || setting.planNum?.trim());
  if (hasAssetConfig) {
    if (!setting.documentId?.trim()) return "资产配置缺少数据存放位置";
    if (!setting.config?.trim()) return "资产配置缺少配置内容";
    const assetConfigMessage = validateLedgerConfigText(setting.config, "资产");
    if (assetConfigMessage) return assetConfigMessage;
  }

  const hasBookkeepingConfig = !!(
    setting.bookkeepingDocumentId?.trim()
    || setting.bookkeepingStorageMode?.trim()
    || setting.bookkeepingConfig?.trim()
  );
  if (hasBookkeepingConfig) {
    if (!setting.bookkeepingDocumentId?.trim()) return "记账配置缺少数据存放位置";
    if (!setting.bookkeepingStorageMode?.trim()) return "记账配置缺少存放方式";
    if (!["central", "date"].includes(setting.bookkeepingStorageMode)) {
      return "记账存放方式无效，请选择集中存放或按日期存放";
    }
    if (!setting.bookkeepingConfig?.trim()) return "记账配置缺少标签配置";
    const bookkeepingConfigMessage = validateLedgerConfigText(setting.bookkeepingConfig, "记账");
    if (bookkeepingConfigMessage) return bookkeepingConfigMessage;
  }

  const validateNumber = (value: string | undefined, label: string, allowZero: boolean): string => {
    if (!value?.trim()) return "";
    const number = Number(value.replace(/,/g, "").trim());
    if (!Number.isFinite(number) || (!allowZero && number <= 0) || (allowZero && number < 0)) {
      return `${label}必须是${allowZero ? "不小于 0 的" : "大于 0 的"}数字`;
    }
    return "";
  };

  if (setting.iconConfig?.trim()) {
    try {
      if (!Array.isArray(JSON.parse(setting.iconConfig))) {
        return "图标配置格式无效，请检查插件设置";
      }
    } catch {
      return "图标配置格式无效，请检查插件设置";
    }
  }

  return validateNumber(setting.planNum, "目标金额", false)
    || validateNumber(setting.bookkeepingMonthlyBudget, "每月预算", true);
}

/**
 * 校验新建记录所依赖的必要配置，返回可直接展示给用户的错误信息。
 */
function getRequiredSettingMessage(setting: SettingConfig, section: "asset" | "bookkeeping"): string {
  const sectionName = section === "asset" ? "资产" : "记账";
  const missingFields: string[] = [];
  const configText = section === "asset" ? setting.config : setting.bookkeepingConfig;

  if (section === "asset") {
    if (!setting.documentId?.trim()) missingFields.push("数据存放位置");
  } else {
    if (!setting.bookkeepingDocumentId?.trim()) missingFields.push("数据存放位置");
    if (!setting.bookkeepingStorageMode?.trim()) missingFields.push("存放方式");
  }
  if (!configText?.trim()) missingFields.push("配置");

  if (missingFields.length > 0) {
    return `请先配置${sectionName}：${missingFields.join("、")}`;
  }

  if (section === "bookkeeping" && !["central", "date"].includes(setting.bookkeepingStorageMode)) {
    return "记账存放方式无效，请先在插件设置中检查";
  }

  return validateLedgerConfigText(configText, sectionName);
}

export {
  getObjectDepth,
  config2TableMDHeader,
  json2TableMDBody,
  tableMD2json,
  deepClone,
  getSettingValidationMessage,
  getRequiredSettingMessage,
  escapeMarkdownTableCell,
  splitMarkdownTableRow,
  sanitizeSvgSymbol,
};
