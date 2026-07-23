import {
  blockDocument,
  createDoc,
  getFileTreeById,
  getLedgerListByYearDocId,
  getTableBlockByDocId,
  getYearDocs,
  insertTableBlock,
  updateBlockContent,
} from "../api/siyuanApi";
import {
  config2TableMDHeader,
  getRequiredSettingMessage,
  json2TableMDBody,
  splitMarkdownTableRow,
} from "../utils/pl-utils";

/** 按日期范围读取资产数据，桌面端和移动端共用同一套年度文档查询逻辑。 */
export async function getAssetLedgerListByDateRange(
  setting: SettingConfig,
  rangeStartDate: string,
  rangeEndDate: string,
): Promise<LedgerItem[]> {
  if (getRequiredSettingMessage(setting, "asset")) return [];

  const yearDocs = await getYearDocs(setting.documentId);
  if (!yearDocs) return [];

  const data: LedgerItem[] = [];
  for (let year = Number(rangeStartDate.split("-")[0]); year <= Number(rangeEndDate.split("-")[0]); year++) {
    const yearDoc = yearDocs.find(item => item.name.replace(".sy", "") === String(year));
    if (!yearDoc) continue;

    const accountList = await getLedgerListByYearDocId(yearDoc.id, setting);
    data.push(...accountList.filter(item => {
      if (!item.time) return false;
      return item.time >= rangeStartDate && item.time <= rangeEndDate;
    }));
  }
  return data;
}

/** 新增一条资产记录，统一处理年度文档、表格块和文档锁定。 */
export async function saveAssetLedger(
  setting: SettingConfig,
  yearDate: string,
  items: LedgerItem[],
): Promise<void> {
  const yearDocumentId = await getYearDocumentId(setting.documentId, yearDate, true);
  if (!yearDocumentId) throw new Error("创建年度资产文档失败");

  let { id: tableBlockId, markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocumentId);
  if (!tableBlockId) {
    tableBlockMarkdown = config2TableMDHeader(setting.config);
  }

  tableBlockMarkdown += "\n" + json2TableMDBody(items);
  tableBlockId = tableBlockId
    ? await updateBlockContent(tableBlockId, tableBlockMarkdown)
    : await insertTableBlock(yearDocumentId, tableBlockMarkdown);

  if (!tableBlockId) throw new Error("保存资产表格失败");
  if (!(await blockDocument(yearDocumentId))) throw new Error("锁定资产文档失败");
}

/** 编辑已有资产记录，只替换匹配到的原始行，避免误写成新表格。 */
export async function replaceAssetLedger(
  setting: SettingConfig,
  year: string,
  originLedgerData: LedgerItem,
  ledgerData: LedgerItem,
): Promise<boolean> {
  const yearDocumentId = await getYearDocumentId(setting.documentId, year, false);
  if (!yearDocumentId) throw new Error("未找到年度资产文档");

  const { id: tableBlockId, markdown: tableBlockMarkdown } = await getTableBlockByDocId(yearDocumentId);
  if (!tableBlockId) throw new Error("未找到原资产表格");

  const tableLines = tableBlockMarkdown
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.startsWith("|") && line.endsWith("|"));

  if (tableLines.length < 2) throw new Error("未找到原资产记录");

  const headerLines = tableLines.slice(0, 2);
  const bodyLines = tableLines.slice(2);
  const isTargetRow = (line: string) => {
    const columns = splitMarkdownTableRow(line);
    return columns[0] === (originLedgerData.time || "")
      && columns[1] === originLedgerData.name;
  };
  const matchedIndex = bodyLines.findIndex(isTargetRow);
  if (matchedIndex < 0) throw new Error("未找到原资产记录");

  const beforeLines = bodyLines.slice(0, matchedIndex);
  const afterLines = bodyLines.slice(matchedIndex).filter(line => !isTargetRow(line));
  const nextRows = json2TableMDBody([ledgerData]).split("\n").filter(Boolean);
  const nextTableMarkdown = [...headerLines, ...beforeLines, ...nextRows, ...afterLines].join("\n");

  if (!(await updateBlockContent(tableBlockId, nextTableMarkdown))) return false;
  if (!(await blockDocument(yearDocumentId))) return false;
  return true;
}

async function getYearDocumentId(
  rootDocumentId: string,
  year: string,
  createIfMissing: boolean,
): Promise<string> {
  const fileList = await getFileTreeById(rootDocumentId);
  const yearFile = fileList.find(file => file.name === `${year}.sy` || file.name === year);
  if (yearFile) return yearFile.id;
  if (!createIfMissing) return "";
  return createDoc(year, rootDocumentId);
}
