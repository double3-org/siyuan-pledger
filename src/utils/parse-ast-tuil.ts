interface AstNode {
  Type?: string;
  Children?: AstNode[];
  Data?: string;
}

interface ParsedTable {
  header: string[];
  rows: string[][];
}

type TableRowJson = Record<string, string>;

type ParsedTableJson = TableRowJson[];

/**
 * 递归提取某个节点下的所有文本
 */
function extractText(node?: AstNode): string {
  if (!node) return "";

  // 文本节点：直接返回内容
  if (node.Type === "NodeText") {
    return node.Data ?? "";
  }

  // 其它节点：递归处理子节点并拼接
  return (node.Children ?? []).map((child) => extractText(child)).join("");
}

/**
 * 遍历整个 AST，提取所有表格, 返回 ParsedTable 数组
 */
function extractTablesArr(root?: AstNode): ParsedTable[] {
  const tables: ParsedTable[] = [];

  function walk(node?: AstNode) {
    if (!node) return;

    // 命中表格节点，立即解析
    if (node.Type === "NodeTable") {
      tables.push(parseTableNode(node));
    }

    // 继续遍历子节点
    for (const child of node.Children ?? []) {
      walk(child);
    }
  }

  walk(root);
  return tables;
}

/**
 * 将 NodeTable AST 解析为 ParsedTable 结构
 */
function parseTableNode(tableNode: AstNode): ParsedTable {
  // 拍平所有行（包含表头）
  const rowNodes: AstNode[] = [];

  for (const child of tableNode.Children ?? []) {
    if (child.Type === "NodeTableHead") {
      rowNodes.push(...(child.Children ?? []));
    } else if (child.Type === "NodeTableRow") {
      rowNodes.push(child);
    }
  }

  if (rowNodes.length === 0) {
    return { header: [], rows: [] };
  }

  // 解析表头（第一行）
  const headerRow = rowNodes[0];
  const header: string[] = [];

  for (const cellNode of headerRow.Children ?? []) {
    if (cellNode.Type !== "NodeTableCell") continue;
    header.push(extractText(cellNode).trim());
  }

  // 解析数据行
  const rows: string[][] = [];

  for (let i = 1; i < rowNodes.length; i++) {
    const rowNode = rowNodes[i];
    if (rowNode.Type !== "NodeTableRow") continue;

    const row: string[] = [];

    for (const cellNode of rowNode.Children ?? []) {
      if (cellNode.Type !== "NodeTableCell") continue;
      row.push(extractText(cellNode));
    }

    // 补齐列数，避免行长度不一致
    while (row.length < header.length) {
      row.push("");
    }

    rows.push(row);
  }

  return { header, rows };
}

function extractTablesJson(root?: AstNode): ParsedTableJson[] {
  const tables: ParsedTableJson[] = [];

  function walk(node?: AstNode) {
    if (!node) return;

    if (node.Type === "NodeTable") {
      tables.push(parseTableNodeToJson(node));
    }

    // 继续遍历子节点
    for (const child of node.Children ?? []) {
      walk(child);
    }
  }

  walk(root);
  return tables;
}

/**
 * 将 NodeTable AST 解析为 JSON 数组
 */
function parseTableNodeToJson(tableNode: AstNode): ParsedTableJson {
  /**
   * Step 1：拍平所有行（包含表头）
   */
  const rowNodes: AstNode[] = [];

  for (const child of tableNode.Children ?? []) {
    if (child.Type === "NodeTableHead") {
      rowNodes.push(...(child.Children ?? []));
    } else if (child.Type === "NodeTableRow") {
      rowNodes.push(child);
    }
  }

  if (rowNodes.length === 0) {
    return [];
  }

  /**
   * Step 2：解析表头
   * 约定：第一行就是 header
   */
  const headerRow = rowNodes[0];
  const headers: string[] = [];

  for (const cellNode of headerRow.Children ?? []) {
    if (cellNode.Type !== "NodeTableCell") continue;
    headers.push(extractText(cellNode).trim());
  }

  /**
   * Step 3：解析数据行
   */
  const result: ParsedTableJson = [];

  for (let i = 1; i < rowNodes.length; i++) {
    const rowNode = rowNodes[i];
    if (rowNode.Type !== "NodeTableRow") continue;

    const rowObject: TableRowJson = {};

    const cellNodes = rowNode.Children ?? [];

    headers.forEach((header, colIndex) => {
      const cellNode = cellNodes[colIndex];

      rowObject[header] =
        cellNode && cellNode.Type === "NodeTableCell"
          ? extractText(cellNode)
          : "";
    });

    result.push(rowObject);
  }

  return result;
}

export { extractTablesArr, extractTablesJson, type AstNode, type ParsedTable, type ParsedTableJson, parseTableNodeToJson };
