import {
  deleteBlock,
  getNotebookConf,
  getNotebookList,
  getPathAndNoteId,
  getPledgeAttributeRows,
  setBlockAttrs,
} from "../api/siyuanApi";
import {
  saveBookkeepingRecord,
  type StoredBookkeepingRecord,
} from "./bookkeepingService";

export type PledgeDataStatus =
  | "managed"
  | "scattered"
  | "conflict"
  | "invalid_attribute"
  | "broken_reference"
  | "unresolved";

export type PledgeScanItem = {
  blockId: string;
  documentId: string;
  notebookId: string;
  notebookName: string;
  path: string;
  hPath: string;
  content: string;
  rawAttribute: string;
  attribute?: Record<string, unknown>;
  record?: StoredBookkeepingRecord;
  status: PledgeDataStatus;
  reasons: string[];
  belongsToCurrent: boolean;
  repairable: boolean;
  changes: string[];
  proposedAttribute?: Record<string, unknown>;
};

export type PledgeScanResult = {
  scannedAt: string;
  setting: {
    storageMode: string;
    storageRootId: string;
  };
  items: PledgeScanItem[];
};

export type CleanResult = {
  success: number;
  skipped: number;
  failed: number;
  details: { blockId: string; status: "success" | "skipped" | "failed"; reason: string }[];
};

export type DeleteResult = CleanResult;

export type ImportPreviewItem = {
  index: number;
  status: "create" | "duplicate" | "conflict" | "damaged";
  reason: string;
  selected: boolean;
  record?: StoredBookkeepingRecord;
  sourceSummary?: string;
};

export type ImportPreview = {
  items: ImportPreviewItem[];
  create: number;
  duplicate: number;
  conflict: number;
  damaged: number;
};

export type ImportResult = {
  success: number;
  skipped: number;
  failed: number;
  details: { index: number; status: "success" | "skipped" | "failed"; reason: string }[];
};

const exportSchemaVersion = 1;
const importTemplateColumns = [
  "收入/支出（必填）", "一级分类（必填）", "二级分类（必填）", "金额（必填）",
  "日期（必填，YYYY-MM-DD）", "时间（选填，HH:mm）", "备注（选填）",
];
const pledgeExportColumns = [
  ...importTemplateColumns,
  "月份", "存放方式", "存放根位置", "Block ID", "文档 ID", "笔记本 ID", "笔记本名称",
  "文档路径", "正文", "数据状态", "异常原因", "原始属性", "导出时间", "导出范围", "数据格式版本",
];

/** 扫描全部 pledge 属性，并使用真实块位置进行分类。 */
export async function scanPledgeData(setting: SettingConfig): Promise<PledgeScanResult> {
  const storageMode = setting.bookkeepingStorageMode;
  const storageRootId = setting.bookkeepingDocumentId?.trim();
  if (storageMode !== "central" && storageMode !== "date") throw new Error("记账存放方式无效");
  if (!storageRootId) throw new Error("记账数据存放位置为空");

  const rootLocation = storageMode === "central"
    ? await getPathAndNoteId(storageRootId)
    : undefined;
  if (storageMode === "central" && (!rootLocation?.notebook || !rootLocation.path)) {
    throw new Error("集中存放位置无效或无法访问");
  }
  if (storageMode === "date" && !(await getNotebookConf(storageRootId))) {
    throw new Error("按日期存放的笔记本无效或无法访问");
  }

  // 思源返回的根文档路径以 .sy 结尾，而子文档路径使用去掉 .sy 后的目录作为前缀。
  const rootPath = rootLocation?.path.replace(/\/+$/, "").replace(/\.sy$/, "") || "";
  const [rows, notebooks] = await Promise.all([
    getPledgeAttributeRows(),
    getNotebookList(),
  ]);
  const notebookNames = new Map(notebooks.map(item => [item.id, item.name]));
  const items: PledgeScanItem[] = [];

  for (const row of rows) {
    items.push(classifyPledgeRow({
      blockId: row.block_id,
      documentId: row.actual_document_id || "",
      rawAttribute: row.value,
      notebookId: row.actual_notebook_id || "",
      notebookName: notebookNames.get(row.actual_notebook_id || "") || "",
      path: row.actual_path || "",
      hPath: row.actual_hpath || "",
      content: row.actual_content || "",
      storageMode,
      storageRootId,
      rootNotebook: rootLocation?.notebook || storageRootId,
      rootPath,
    }));
  }

  return {
    scannedAt: new Date().toISOString(),
    setting: { storageMode, storageRootId },
    items,
  };
}

function classifyPledgeRow(input: {
  blockId: string;
  documentId: string;
  rawAttribute: string;
  notebookId: string;
  notebookName: string;
  path: string;
  hPath: string;
  content: string;
  storageMode: "central" | "date";
  storageRootId: string;
  rootNotebook: string;
  rootPath: string;
}): PledgeScanItem {
  const base = {
    blockId: input.blockId,
    documentId: input.documentId,
    notebookId: input.notebookId,
    notebookName: input.notebookName,
    path: input.path,
    hPath: input.hPath,
    content: input.content,
    rawAttribute: input.rawAttribute,
  };

  let attribute: Record<string, unknown>;
  try {
    const parsed = JSON.parse(input.rawAttribute);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    attribute = parsed;
  } catch {
    return {
      ...base,
      status: "invalid_attribute",
      reasons: ["custom-pledge 不是有效的 JSON 对象"],
      belongsToCurrent: false,
      repairable: false,
      changes: [],
    };
  }

  const record = parseBookkeepingRecord(attribute, input.blockId, input.documentId);
  if (!input.documentId) {
    return {
      ...base,
      attribute,
      record,
      status: "broken_reference",
      reasons: ["属性所在块不存在或无法读取所属文档"],
      belongsToCurrent: false,
      repairable: false,
      changes: [],
    };
  }
  if (!input.notebookId || !input.path) {
    return {
      ...base,
      attribute,
      record,
      status: "broken_reference",
      reasons: ["块所属文档不存在或位置无法访问"],
      belongsToCurrent: false,
      repairable: false,
      changes: [],
    };
  }
  if (!record) {
    return {
      ...base,
      attribute,
      status: "invalid_attribute",
      reasons: ["缺少日期、类型、分类或有效金额等业务字段"],
      belongsToCurrent: false,
      repairable: false,
      changes: [],
    };
  }

  const insideLocation = input.storageMode === "central"
    ? input.notebookId === input.rootNotebook
      && (input.documentId === input.storageRootId || input.path.startsWith(`${input.rootPath}/`))
    : input.notebookId === input.storageRootId;
  // 集中存放有明确的文档边界，可以可靠修复错误模式；按日期存放仅靠笔记本无法排除集中数据。
  const belongsToCurrent = insideLocation
    && (input.storageMode === "central" || attribute.storageMode === "date");

  if (belongsToCurrent) {
    const proposedAttribute = createCanonicalPledgeAttribute(record, {
      storageMode: input.storageMode,
      storageRootId: input.storageRootId,
      documentId: input.documentId,
      blockId: input.blockId,
    });
    const changes = getChangedFields(attribute, proposedAttribute);
    if (changes.length === 0) {
      return {
        ...base,
        attribute,
        record,
        status: "managed",
        reasons: ["数据与当前配置及实际位置一致"],
        belongsToCurrent: true,
        repairable: false,
        changes: [],
      };
    }

    const missingOrInvalidFields = changes.filter(field =>
      attribute[field] === undefined
      || (field === "amount" && typeof attribute.amount !== "number")
      || (field === "remark" && typeof attribute.remark !== "string"),
    );

    const removedFields = changes.filter(field => !(field in proposedAttribute));
    const updatedFields = changes.filter(field => field in proposedAttribute);
    const reasons: string[] = [];
    if (missingOrInvalidFields.length) {
      reasons.push(`属性字段缺失或格式异常：${missingOrInvalidFields.join("、")}`);
    } else if (updatedFields.length) {
      reasons.push(`属性与实际位置或当前配置冲突：${updatedFields.join("、")}`);
    }
    if (removedFields.length) reasons.push(`包含无用属性：${removedFields.join("、")}`);

    return {
      ...base,
      attribute,
      record,
      status: missingOrInvalidFields.length || removedFields.length ? "invalid_attribute" : "conflict",
      reasons,
      belongsToCurrent: true,
      repairable: true,
      changes,
      proposedAttribute,
    };
  }

  const declaredModeValid = attribute.storageMode === "central" || attribute.storageMode === "date";
  const declaredRootValid = typeof attribute.storageRootId === "string" && !!attribute.storageRootId.trim();
  if (declaredModeValid && (declaredRootValid || attribute.storageMode === "date")) {
    const proposedAttribute = createCanonicalPledgeAttribute(record, {
      storageMode: attribute.storageMode === "central" ? "central" : "date",
      storageRootId: attribute.storageMode === "date"
        ? input.notebookId
        : String(attribute.storageRootId),
      documentId: input.documentId,
      blockId: input.blockId,
    });
    const changes = getChangedFields(attribute, proposedAttribute);
    const removedFields = changes.filter(field => !(field in proposedAttribute));
    const declaresCurrent = attribute.storageMode === input.storageMode
      && attribute.storageRootId === input.storageRootId;
    return {
      ...base,
      attribute,
      record,
      status: removedFields.length ? "invalid_attribute" : "scattered",
      reasons: [
        declaresCurrent
          ? "属性声明属于当前配置，但块的实际位置已经越界"
          : "可以识别存放方式或历史根位置，但不属于当前配置",
        ...(removedFields.length ? [`包含无用属性：${removedFields.join("、")}`] : []),
      ],
      belongsToCurrent: false,
      repairable: changes.length > 0,
      changes,
      ...(changes.length ? { proposedAttribute } : {}),
    };
  }

  if (attribute.storageMode !== "central" && attribute.storageMode !== "date") {
    return {
      ...base,
      attribute,
      record,
      status: "invalid_attribute",
      reasons: ["storageMode 缺失或无效，且无法根据当前位置可靠推断"],
      belongsToCurrent: false,
      repairable: false,
      changes: [],
    };
  }

  return {
    ...base,
    attribute,
    record,
    status: "unresolved",
    reasons: ["不属于当前配置，且无法可靠识别其目标配置"],
    belongsToCurrent: false,
    repairable: false,
    changes: [],
  };
}

function parseBookkeepingRecord(
  data: Record<string, unknown>,
  blockId = "",
  documentId = "",
): StoredBookkeepingRecord | undefined {
  if (data.type !== "expense" && data.type !== "income") return undefined;
  if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return undefined;
  if (typeof data.parentName !== "string" || !data.parentName.trim()) return undefined;
  if (typeof data.childName !== "string" || !data.childName.trim()) return undefined;
  const amount = Number(data.amount);
  if (!Number.isFinite(amount)) return undefined;

  return {
    type: data.type,
    date: data.date,
    parentName: data.parentName,
    childName: data.childName,
    amount,
    remark: typeof data.remark === "string" ? data.remark : "",
    ...(blockId ? { blockId } : {}),
    ...(documentId ? { documentId } : {}),
    ...(typeof data.createdAt === "string" ? { createdAt: data.createdAt } : {}),
    ...(typeof data.displayTime === "string" ? { displayTime: data.displayTime } : {}),
  };
}

/** 清洗结果使用字段白名单，未列入的页面临时字段和历史废弃字段会被删除。 */
function createCanonicalPledgeAttribute(
  record: StoredBookkeepingRecord,
  location: {
    storageMode: "central" | "date";
    storageRootId: string;
    documentId: string;
    blockId: string;
  },
): Record<string, unknown> {
  return {
    type: record.type,
    date: record.date,
    parentName: record.parentName,
    childName: record.childName,
    amount: record.amount,
    remark: record.remark,
    month: record.date.slice(0, 7),
    storageMode: location.storageMode,
    storageRootId: location.storageRootId,
    documentId: location.documentId,
    blockId: location.blockId,
    ...(record.createdAt ? { createdAt: record.createdAt } : {}),
    ...(record.displayTime ? { displayTime: record.displayTime } : {}),
  };
}

function getChangedFields(current: Record<string, unknown>, next: Record<string, unknown>): string[] {
  const standardFields = [
    "type", "date", "parentName", "childName", "amount", "remark", "month",
    "storageMode", "storageRootId", "documentId", "blockId", "createdAt", "displayTime",
  ];
  const fields = Array.from(new Set([
    ...standardFields,
    ...Object.keys(current),
    ...Object.keys(next),
  ]));
  return fields.filter(field => current[field] !== next[field]);
}

/** 清洗只更新属性，正确数据和不可可靠修复的数据会被跳过。 */
export async function cleanPledgeData(items: PledgeScanItem[]): Promise<CleanResult> {
  const result: CleanResult = { success: 0, skipped: 0, failed: 0, details: [] };
  for (const item of items) {
    if (!item.repairable || !item.proposedAttribute) {
      result.skipped += 1;
      result.details.push({ blockId: item.blockId, status: "skipped", reason: "无需清洗或无法可靠修复" });
      continue;
    }

    try {
      const saved = await setBlockAttrs(item.blockId, {
        "custom-pledge": JSON.stringify(item.proposedAttribute),
      });
      if (!saved) throw new Error("思源未确认属性更新成功");
      result.success += 1;
      result.details.push({ blockId: item.blockId, status: "success", reason: "属性已更新" });
    } catch (error) {
      result.failed += 1;
      result.details.push({
        blockId: item.blockId,
        status: "failed",
        reason: error instanceof Error ? error.message : "属性更新失败",
      });
    }
  }
  return result;
}

/** 删除用户明确选择的 pledge 块，逐条记录结果，避免单条失败中断整批操作。 */
export async function deletePledgeData(items: PledgeScanItem[]): Promise<DeleteResult> {
  const result: DeleteResult = { success: 0, skipped: 0, failed: 0, details: [] };
  for (const item of items) {
    if (!item.blockId) {
      result.skipped += 1;
      result.details.push({ blockId: "无法读取", status: "skipped", reason: "缺少 Block ID" });
      continue;
    }
    try {
      if (!(await deleteBlock(item.blockId))) throw new Error("思源未确认块删除成功");
      result.success += 1;
      result.details.push({ blockId: item.blockId, status: "success", reason: "块已删除" });
    } catch (error) {
      result.failed += 1;
      result.details.push({
        blockId: item.blockId,
        status: "failed",
        reason: error instanceof Error ? error.message : "块删除失败",
      });
    }
  }
  return result;
}

/** 生成可再次导入的记账表格 CSV，并在后部保留数据维护所需的完整备份字段。 */
export function serializePledgeExport(scan: PledgeScanResult, scope: "managed" | "all"): string {
  const items = scope === "managed"
    ? scan.items.filter(item => item.belongsToCurrent)
    : scan.items;
  const exportedAt = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  for (const item of items) {
    const business = item.record || item.attribute || {};
    rows.push({
      "收入/支出（必填）": business.type === "income" ? "收入" : business.type === "expense" ? "支出" : "",
      "一级分类（必填）": business.parentName,
      "二级分类（必填）": business.childName,
      "金额（必填）": business.amount,
      "日期（必填，YYYY-MM-DD）": business.date,
      "时间（选填，HH:mm）": business.displayTime,
      "备注（选填）": business.remark,
      "月份": business.month,
      "存放方式": business.storageMode,
      "存放根位置": business.storageRootId,
      "Block ID": item.blockId,
      "文档 ID": item.documentId,
      "笔记本 ID": item.notebookId,
      "笔记本名称": item.notebookName,
      "文档路径": item.hPath || item.path,
      "正文": item.content,
      "数据状态": item.status,
      "异常原因": item.reasons.join("；"),
      "原始属性": item.rawAttribute,
      "导出时间": exportedAt,
      "导出范围": scope,
      "数据格式版本": exportSchemaVersion,
    });
  }
  const csvRows = [pledgeExportColumns, ...rows.map(row => pledgeExportColumns.map(column => row[column] ?? ""))];
  return `\uFEFF${csvRows.map(row => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}

/** 下载模板只保留用户需要填写的记账字段，示例行默认无法通过分类校验，避免误导入。 */
export function serializePledgeImportTemplate(): string {
  const example = [
    "支出", "请替换一级分类", "请替换二级分类",
    "25.00", new Date().toISOString().slice(0, 10), "08:30", "示例数据，填写时请替换或删除此行",
  ];
  return `\uFEFF${[importTemplateColumns, example].map(row => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}

/** 校验导入文件并按当前数据、当前分类配置生成预览。 */
export function preparePledgeImport(
  text: string,
  setting: SettingConfig,
  scan: PledgeScanResult,
): ImportPreview {
  const csvRows = parseCsv(text);
  if (csvRows.length < 2) throw new Error("CSV 文件没有有效数据");
  const headers = csvRows[0];
  const missingColumns = importTemplateColumns.filter(column => !headers.includes(column));
  if (missingColumns.length) throw new Error(`CSV 表头不匹配，缺少：${missingColumns.join("、")}。请重新下载导入模板。`);
  const rows = csvRows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
  const records = rows.map(row => {
    const typeText = row["收入/支出（必填）"].trim();
    const parentName = row["一级分类（必填）"].trim();
    const childName = row["二级分类（必填）"].trim();
    const amountText = row["金额（必填）"].trim();
    const dateText = row["日期（必填，YYYY-MM-DD）"].trim();
    const timeText = row["时间（选填，HH:mm）"].trim();
    const remark = row["备注（选填）"].trim();
    const sourceSummary = [
      `${dateText}${timeText ? ` ${timeText}` : ""}`,
      typeText,
      [parentName, childName].filter(Boolean).join("/"),
      amountText,
      remark,
    ].filter(Boolean).join("｜");
    const type = typeText === "收入"
      ? "income"
      : typeText === "支出" ? "expense" : undefined;
    if (!type) return { error: `收入/支出“${typeText || "空"}”无效，只能填写“收入”或“支出”`, sourceSummary };
    if (!parentName) return { error: "一级分类不能为空", sourceSummary };
    if (!childName) return { error: "二级分类不能为空", sourceSummary };
    const amount = Number(amountText);
    if (!amountText || !Number.isFinite(amount) || amount <= 0) {
      return { error: `金额“${amountText || "空"}”无效，必须填写大于 0 的数字`, sourceSummary };
    }
    const date = normalizeImportDate(dateText);
    if (!date) return { error: `日期“${dateText || "空"}”无法识别，请填写 YYYY-MM-DD 或 YYYY/M/D`, sourceSummary };
    const displayTime = normalizeImportTime(timeText);
    if (timeText && !displayTime) return { error: `时间“${timeText}”无法识别，请填写 HH:mm`, sourceSummary };
    return {
      attribute: {
        type,
        date,
        parentName,
        childName,
        amount,
        remark,
        ...(displayTime ? { displayTime } : {}),
      },
      sourceSummary,
    };
  });

  const existing = new Set(
    scan.items
      .filter(item => item.belongsToCurrent && item.record)
      .map(item => getRecordFingerprint(item.record!)),
  );
  const importing = new Set<string>();
  const categories = parseBookkeepingCategories(setting.bookkeepingConfig);
  const items: ImportPreviewItem[] = records.map((entry, index) => {
    if ("error" in entry) {
      return { index, status: "damaged", reason: entry.error, selected: false, sourceSummary: entry.sourceSummary };
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { index, status: "damaged", reason: "记录格式无效", selected: false, sourceSummary: entry.sourceSummary };
    }
    const attribute = (entry as Record<string, unknown>).attribute;
    if (!attribute || typeof attribute !== "object" || Array.isArray(attribute)) {
      return { index, status: "damaged", reason: "记录缺少有效业务字段", selected: false, sourceSummary: entry.sourceSummary };
    }
    const record = parseBookkeepingRecord(attribute as Record<string, unknown>);
    if (!record) return { index, status: "damaged", reason: "记录字段无法转换，请检查日期、分类和金额", selected: false, sourceSummary: entry.sourceSummary };

    const fingerprint = getRecordFingerprint(record);
    if (existing.has(fingerprint) || importing.has(fingerprint)) {
      return { index, status: "duplicate", reason: "疑似与现有记录或本次导入记录重复", selected: false, record, sourceSummary: entry.sourceSummary };
    }
    importing.add(fingerprint);

    const children = categories.get(record.parentName);
    if (!children?.has(record.childName)) {
      return { index, status: "conflict", reason: `当前配置中不存在分类“${record.parentName}/${record.childName}”`, selected: false, record, sourceSummary: entry.sourceSummary };
    }
    return { index, status: "create", reason: "字段有效，可以导入", selected: true, record, sourceSummary: entry.sourceSummary };
  });

  return {
    items,
    create: items.filter(item => item.status === "create").length,
    duplicate: items.filter(item => item.status === "duplicate").length,
    conflict: items.filter(item => item.status === "conflict").length,
    damaged: items.filter(item => item.status === "damaged").length,
  };
}

function normalizeImportDate(value: string): string | undefined {
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeImportTime(value: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return undefined;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

/** 支持引号转义及单元格内换行，确保正文和 JSON 属性能够完整导回。 */
function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && !cell) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && source[index + 1] === "\n") index += 1;
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("CSV 文件存在未闭合的引号");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(current => current.some(value => value !== ""));
}

/** 只执行预览中标记为可创建的记录，其他记录保持跳过。 */
export async function importPledgeData(
  preview: ImportPreview,
  setting: SettingConfig,
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, skipped: 0, failed: 0, details: [] };
  for (const item of preview.items) {
    if (!item.selected || !item.record) {
      result.skipped += 1;
      result.details.push({ index: item.index, status: "skipped", reason: item.reason });
      continue;
    }

    const saved = await saveBookkeepingRecord(item.record, setting, undefined, { silent: true });
    if (saved) {
      result.success += 1;
      result.details.push({ index: item.index, status: "success", reason: "导入成功" });
    } else {
      result.failed += 1;
      result.details.push({ index: item.index, status: "failed", reason: "写入记账记录失败" });
    }
  }
  return result;
}

function getRecordFingerprint(record: StoredBookkeepingRecord): string {
  return JSON.stringify([
    record.date,
    record.type,
    record.parentName.trim(),
    record.childName.trim(),
    Number(record.amount).toFixed(2),
    record.remark.trim(),
  ]);
}

function parseBookkeepingCategories(configText: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  try {
    const config = JSON.parse(configText || "[]");
    if (!Array.isArray(config)) return result;
    for (const parent of config) {
      if (!parent?.name || !Array.isArray(parent.children)) continue;
      result.set(parent.name, new Set(parent.children.map((child: { name?: string }) => child?.name).filter(Boolean)));
    }
  } catch (error) {
    console.error("解析记账分类配置失败", error);
  }
  return result;
}
