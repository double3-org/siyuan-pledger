import { showMessage } from "siyuan";
import {
  createDoc,
  createDocWithMdByHPath,
  deleteBlock,
  getBookkeepingRecordsByPledge,
  getCurrentDateTime,
  getFileTreeById,
  getIDsByHPath,
  getNotebookConf,
  insertMarkdownBlock,
  setBlockAttrs,
  updateBlockContent,
} from "../api/siyuanApi";
import { escapeMarkdownTableCell } from "../utils/pl-utils";

export type StoredBookkeepingRecord = BookkeepingRecord & {
  blockId?: string;
  documentId?: string;
  displayTime?: string;
  createdAt?: string;
  month?: string;
  storageMode?: string;
};

export type LoadBookkeepingRecordsResult = {
  records: StoredBookkeepingRecord[];
  error?: string;
};

/** 只持久化记账业务和定位所需字段，避免把页面使用的 id、icon 等临时字段写入属性。 */
function createStoredBookkeepingRecord(
  record: StoredBookkeepingRecord,
  setting: SettingConfig,
  blockId: string,
  documentId: string | undefined,
  createdAt: string,
  displayTime: string,
): StoredBookkeepingRecord {
  return {
    type: record.type,
    date: record.date,
    parentName: record.parentName,
    childName: record.childName,
    amount: Number(record.amount),
    remark: record.remark || "",
    month: record.date.slice(0, 7),
    storageMode: setting.bookkeepingStorageMode,
    storageRootId: setting.bookkeepingDocumentId,
    ...(documentId ? { documentId } : {}),
    blockId,
    createdAt,
    displayTime,
  };
}

/** 读取当前配置对应的记账记录。 */
export async function loadBookkeepingRecords(
  setting: SettingConfig,
): Promise<LoadBookkeepingRecordsResult> {
  try {
    const records = await getBookkeepingRecordsByPledge(
      setting.bookkeepingStorageMode,
      setting.bookkeepingDocumentId,
    );
    return { records };
  } catch (error) {
    console.error("读取记账记录失败", error);
    return {
      records: [],
      error: error instanceof Error ? error.message : "记账数据读取失败",
    };
  }
}

/** 删除记账块，页面层负责更新列表和提示信息。 */
export async function deleteBookkeepingRecord(blockId?: string): Promise<boolean> {
  if (!blockId) return false;
  return deleteBlock(blockId);
}

/**
 * 保存记账记录，包含新增、编辑、跨文档移动和失败回滚。
 * 该流程由桌面端和移动端共用，避免两端的数据一致性规则继续分叉。
 */
export async function saveBookkeepingRecord(
  record: StoredBookkeepingRecord,
  setting: SettingConfig,
  previousRecord?: StoredBookkeepingRecord,
  options: { silent?: boolean } = {},
): Promise<StoredBookkeepingRecord | undefined> {
  let insertedBlockId = "";
  let updatedBlockId = "";
  const previousMarkdown = previousRecord ? recordToMarkdown(previousRecord) : "";

  const rollbackInsertedBlock = async () => {
    if (!insertedBlockId) return;
    try {
      if (await deleteBlock(insertedBlockId)) insertedBlockId = "";
    } catch (error) {
      console.error("回滚记账块失败", { blockId: insertedBlockId, error });
    }
  };

  const rollbackUpdatedBlock = async () => {
    if (!updatedBlockId || !previousMarkdown) return;
    try {
      if (await updateBlockContent(updatedBlockId, previousMarkdown)) {
        updatedBlockId = "";
      } else {
        console.error("恢复原记账内容失败", { blockId: updatedBlockId });
      }
    } catch (error) {
      console.error("恢复原记账内容失败", { blockId: updatedBlockId, error });
    }
  };

  try {
    if (!setting.bookkeepingDocumentId) {
      notify(options.silent, "请先配置记账数据存放位置", 2000, "error");
      return undefined;
    }

    const blockMarkdown = recordToMarkdown(record);
    const now = await getCurrentDateTime();

    if (record.blockId) {
      const targetDocumentId = record.documentId
        ? await getBookkeepingTargetDocumentId(record, setting, options.silent)
        : "";

      if (targetDocumentId && record.documentId && targetDocumentId !== record.documentId) {
        const blockId = await insertMarkdownBlock(targetDocumentId, blockMarkdown);
        if (!blockId) throw new Error("插入记账块失败");
        insertedBlockId = blockId;

        const pledgeData = createStoredBookkeepingRecord(
          record,
          setting,
          blockId,
          targetDocumentId,
          record.createdAt || now.iso,
          record.displayTime || now.time,
        );
        const isAttrSaved = await setBlockAttrs(blockId, {
          "custom-pledge": JSON.stringify(pledgeData),
        });

        if (!isAttrSaved) {
          await rollbackInsertedBlock();
          notify(options.silent, "记账移动失败，原记录未修改", 3000, "error");
          return undefined;
        }

        if (!(await deleteBlock(record.blockId))) {
          await rollbackInsertedBlock();
          notify(options.silent, "记账移动失败，原记录未修改", 3000, "error");
          return undefined;
        }

        insertedBlockId = "";
        notify(options.silent, "记账修改成功", 2000, "info");
        return pledgeData;
      }

      updatedBlockId = record.blockId;
      if (!(await updateBlockContent(record.blockId, blockMarkdown))) {
        throw new Error("更新记账块失败");
      }

      const pledgeData = createStoredBookkeepingRecord(
        record,
        setting,
        record.blockId,
        record.documentId,
        record.createdAt || now.iso,
        record.displayTime || now.time,
      );
      const isAttrSaved = await setBlockAttrs(record.blockId, {
        "custom-pledge": JSON.stringify(pledgeData),
      });

      if (!isAttrSaved) {
        await rollbackUpdatedBlock();
        notify(options.silent, "记账修改失败，原记录未修改", 3000, "error");
        return undefined;
      }

      updatedBlockId = "";
      notify(options.silent, "记账修改成功", 2000, "info");
      return pledgeData;
    }

    const targetDocumentId = await getBookkeepingTargetDocumentId(record, setting, options.silent);
    if (!targetDocumentId) {
      notify(options.silent, "未找到记账写入文档", 2000, "error");
      return undefined;
    }

    const blockId = await insertMarkdownBlock(targetDocumentId, blockMarkdown);
    if (!blockId) throw new Error("插入记账块失败");
    insertedBlockId = blockId;

    const pledgeData = createStoredBookkeepingRecord(
      record,
      setting,
      blockId,
      targetDocumentId,
      record.createdAt || now.iso,
      record.displayTime || now.time,
    );
    const isAttrSaved = await setBlockAttrs(blockId, {
      "custom-pledge": JSON.stringify(pledgeData),
    });

    if (!isAttrSaved) {
      await rollbackInsertedBlock();
      notify(options.silent, "记账保存失败，未留下半成品记录", 3000, "error");
      return undefined;
    }

    insertedBlockId = "";
    notify(options.silent, "记账保存成功", 2000, "info");
    return pledgeData;
  } catch (error) {
    await rollbackInsertedBlock();
    await rollbackUpdatedBlock();
    console.error("保存记账记录失败", error);
    notify(options.silent, "记账保存失败，原记录可能需要检查", 3000, "error");
    return undefined;
  }
}

async function getBookkeepingTargetDocumentId(
  record: BookkeepingRecord,
  setting: SettingConfig,
  silent = false,
): Promise<string> {
  if (setting.bookkeepingStorageMode === "central") {
    return getCentralBookkeepingDocumentId(record, setting);
  }
  if (setting.bookkeepingStorageMode === "date") {
    return getDailyBookkeepingDocumentId(record, setting, silent);
  }

  notify(silent, "未知的记账存放方式", 2000, "error");
  return "";
}

async function getCentralBookkeepingDocumentId(
  record: BookkeepingRecord,
  setting: SettingConfig,
): Promise<string> {
  const monthTitle = record.date.slice(0, 7);
  const fileList = await getFileTreeById(setting.bookkeepingDocumentId);
  const monthFile = fileList.find(file => file.name === `${monthTitle}.sy` || file.name === monthTitle);
  if (monthFile) return monthFile.id;
  return createDoc(monthTitle, setting.bookkeepingDocumentId);
}

async function getDailyBookkeepingDocumentId(
  record: BookkeepingRecord,
  setting: SettingConfig,
  silent = false,
): Promise<string> {
  const notebookId = setting.bookkeepingDocumentId;
  if (!notebookId) return "";

  const notebookConf = await getNotebookConf(notebookId);
  const dailyNoteSavePath = notebookConf?.conf?.dailyNoteSavePath;
  if (!dailyNoteSavePath) {
    notify(silent, "未读取到新建日记路径配置", 3000, "error");
    return "";
  }

  const dailyNotePath = renderDailyNotePath(dailyNoteSavePath, record.date);
  if (!dailyNotePath) {
    notify(silent, "暂不支持当前新建日记路径模板", 3000, "error");
    return "";
  }

  const ids = await getIDsByHPath(notebookId, dailyNotePath);
  if (ids.length > 0) return ids[0];
  return createDocWithMdByHPath(notebookId, dailyNotePath, "");
}

function renderDailyNotePath(template: string, date: string): string {
  const dateObj = new Date(`${date}T00:00:00`);
  const renderedPath = template.replace(
    /{{\s*now\s*\|\s*date\s+["']([^"']+)["']\s*}}/g,
    (_match, layout: string) => formatGoDateLayout(dateObj, layout),
  );
  if (renderedPath.includes("{{")) return "";
  return renderedPath.startsWith("/") ? renderedPath : `/${renderedPath}`;
}

function formatGoDateLayout(date: Date, layout: string): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  const tokenMap: Record<string, string> = {
    "2006": String(date.getFullYear()),
    "1": String(date.getMonth() + 1),
    "01": pad(date.getMonth() + 1),
    "2": String(date.getDate()),
    "02": pad(date.getDate()),
    "15": pad(date.getHours()),
    "04": pad(date.getMinutes()),
    "05": pad(date.getSeconds()),
  };
  return layout.replace(/2006|01|02|15|04|05|1|2/g, token => tokenMap[token]);
}

function recordToMarkdown(record: BookkeepingRecord): string {
  return [
    record.date,
    record.parentName,
    record.childName,
    record.type === "expense" ? "支出" : "收入",
    record.amount.toFixed(2),
    record.remark || "",
  ].map(escapeMarkdownTableCell).join("|");
}

function notify(
  silent: boolean | undefined,
  message: string,
  timeout: number,
  type: "info" | "error",
) {
  if (!silent) showMessage(message, timeout, type);
}
