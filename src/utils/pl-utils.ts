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
  return allRows.map((row) => `| ${row.join(" | ")} |`).join("\n");
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
    .slice(1, -1)
    .split("|")
    .map((h) => h.trim());

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
    const cols = lines[i]
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

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

export { getObjectDepth, config2TableMDHeader, json2TableMDBody, tableMD2json };
