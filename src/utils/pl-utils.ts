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
  headerMdStr += "\n";
  return headerMdStr;
}

/**
 * 将 json 转为 markdown table body
 * @param jsonData 账本项数组
 * @returns markdown 表格体字符串
 */
function json2TableMDBody(jsonData: LedgerItem[], depth?: number) {
  // 获取层级
  const finalDepth = depth ?? getObjectDepth(jsonData);
  const currentDepth = 0;

  // 辅助函数：递归构建表格行
  function buildRows(item: LedgerItem, path: string[], rows: string[][]) {
    const currentPath = [...path, item.name];

    // 如果没有子项或子项为空数组，则为叶子节点，生成一行
    if (!item.children || item.children.length === 0) {
      // 构建行数据：时间 + 类型路径 + 金额
      const row: string[] = [];
      row.push(item.time || "");
      // 补齐类型列
      for (let i = 0; i < finalDepth; i++) {
        row.push(currentPath[i] || "");
      }
      row.push(item.amount.toFixed(2));
      rows.push(row);
      return;
    }

    // 如果有子项，递归处理每个子项
    if (currentDepth < finalDepth) {
      for (const child of item.children) {
        buildRows(child, currentPath, rows);
      }
    }
  }

  // 遍历每个 LedgerItem
  const allRows: string[][] = [];
  for (const ledgerItem of jsonData) {
    buildRows(ledgerItem, [], allRows);
  }

  // 将所有行转换为 markdown 格式
  return allRows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}

export { getObjectDepth, config2TableMDHeader, json2TableMDBody };
