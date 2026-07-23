import { fetchSyncPost, IWebSocketData, IFile } from "siyuan";
import { tableMD2json } from "../utils/pl-utils";

/** 统一处理思源 API 的网络异常，避免单次请求失败打断整个保存流程。 */
async function postSiyuanApi(
  path: string,
  data: Record<string, unknown> = {},
): Promise<IWebSocketData | undefined> {
  try {
    return await fetchSyncPost(path, data);
  } catch (error) {
    console.error(`调用 ${path} 失败:`, error);
    return undefined;
  }
}

/** 从写操作响应中安全提取块 ID，响应异常时返回空字符串。 */
function getOperationId(resp: IWebSocketData | undefined, action: string): string {
  const id = resp?.data?.[0]?.doOperations?.[0]?.id;
  if (resp?.code !== 0 || typeof id !== "string" || !id) {
    console.error(`${action}失败或返回格式错误:`, resp);
    return "";
  }
  return id;
}

/**
 * 根据文档id获取文档路径 和 notebook id /api/filetree/getPathByID
 * @param {string} id 文档id
 * @return {notebook: string; path: string} 笔记本id 和 文件路径
 */
export async function getPathAndNoteId(
  id: string,
): Promise<{ notebook: string; path: string }> {
  const normalizedId = id?.trim();
  if (!normalizedId) return { notebook: "", path: "" };

  const resp = await postSiyuanApi("/api/filetree/getPathByID", { id: normalizedId });
  if (!resp || resp.code !== 0 || !resp.data?.notebook || !resp.data?.path) {
    console.error("获取文件路径失败:", resp);
    return { notebook: "", path: "" };
  }
  return { notebook: resp.data.notebook, path: resp.data.path };
}

/**
 * 根据文档id获取文档可读路径 /api/filetree/getHPathByID
 * @param {string} id 文档id
 * @return {notebook: string; path: string} 笔记本id 和 文件路径
 */
export async function getHPath(id: string): Promise<string> {
  const normalizedId = id?.trim();
  if (!normalizedId) return "";

  const resp = await postSiyuanApi("/api/filetree/getHPathByID", { id: normalizedId });
  if (!resp || resp.code !== 0 || typeof resp.data !== "string") {
    console.error("获取文件路径失败:", resp);
    return "";
  }
  return resp.data;
}

/**
 * 根据文档id获取文件树
 * 1、getPathAndNoteId
 * 2、根据文件路径获取文件树 /api/filetree/listDocsByPath
 * @param {string} id 文档id
 * @return {array} 文件树 id, name, path
 */
export async function getFileTreeById(id: string): Promise<IFile[]> {
  if (!id?.trim()) return [];

  const docPathResp = await getPathAndNoteId(id);
  if (!docPathResp.notebook || !docPathResp.path) return [];

  const fileTreeResp = await postSiyuanApi("/api/filetree/listDocsByPath", {
    notebook: docPathResp.notebook,
    path: docPathResp.path,
  });
  if (!fileTreeResp || fileTreeResp.code !== 0 || !Array.isArray(fileTreeResp.data?.files)) {
    console.error("获取文件树失败:", fileTreeResp);
    return [];
  }
  return fileTreeResp.data.files;
}

/**
 * 创建文档, 根据名称，在父文档下创建
 * 1、getHPath
 * 1、getPathAndNoteId
 * 2、创建文档 /api/filetree/createDocWithMd
 * @param title 文档标题
 * @param pDocId 父文档id
 * @return 文档id
 */
export async function createDoc(
  title: string,
  pDocId: string,
): Promise<string> {
  const docHPath = await getHPath(pDocId);
  const docPathResp = await getPathAndNoteId(pDocId);
  if (!docHPath || !docPathResp.notebook || !docPathResp.path || !title?.trim()) {
    console.error("创建文档失败：父文档路径无效或文档标题为空");
    return "";
  }
  const resp = await postSiyuanApi("/api/filetree/createDocWithMd", {
    notebook: docPathResp.notebook,
    path: docHPath + "/" + title,
    markdown: "",
  });
  if (!resp || resp.code !== 0 || typeof resp.data !== "string") {
    console.error("创建文档失败或返回格式错误:", resp);
    return "";
  }
  return resp.data;
}

/**
 * 按人类可读路径创建文档 /api/filetree/createDocWithMd
 */
export async function createDocWithMdByHPath(
  notebook: string,
  path: string,
  markdown = "",
): Promise<string> {
  const resp = await postSiyuanApi("/api/filetree/createDocWithMd", {
    notebook,
    path,
    markdown,
  });
  if (!resp || resp.code !== 0 || typeof resp.data !== "string") {
    console.error("按路径创建文档失败:", resp);
    return "";
  }
  return resp.data;
}

/**
 * 根据人类可读路径获取文档 ID /api/filetree/getIDsByHPath
 */
export async function getIDsByHPath(
  notebook: string,
  path: string,
): Promise<string[]> {
  if (!notebook?.trim() || !path?.trim()) return [];

  const resp = await postSiyuanApi("/api/filetree/getIDsByHPath", {
    notebook,
    path,
  });
  if (!resp || resp.code !== 0) {
    console.error("根据人类可读路径获取 IDs 失败:", resp);
    return [];
  }
  if (!Array.isArray(resp.data)) {
    console.error("根据人类可读路径获取 IDs 返回格式错误:", resp);
    return [];
  }
  return resp.data;
}

/**
 * 获取笔记本配置 /api/notebook/getNotebookConf
 */
export async function getNotebookConf(notebook: string): Promise<any> {
  if (!notebook?.trim()) return undefined;

  const resp = await postSiyuanApi("/api/notebook/getNotebookConf", { notebook });
  if (!resp || resp.code !== 0) {
    console.error("获取笔记本配置失败:", resp);
    return undefined;
  }
  return resp.data;
}

/**
 * 根据文档id, 获取第一个表格块信息, 包含 id 和 markdown
 * SELECT id,markdown FROM blocks WHERE root_id = '20251225201147-xfwjyyj' AND type = 't' limit 1
 */
export async function getTableBlockByDocId(
  id: string,
): Promise<{ id: string; markdown: string }> {
  if (!id?.trim()) return { id: "", markdown: "" };

  const sql = `SELECT id,markdown FROM blocks WHERE root_id = '${id}' AND type = 't' limit 1`;
  const resp = await executeSql(sql);
  if (!resp || resp.code !== 0 || !Array.isArray(resp.data) || resp.data.length < 1) {
    return { id: "", markdown: "" };
  }
  const tableBlock = resp.data[0];
  if (typeof tableBlock?.id !== "string" || typeof tableBlock?.markdown !== "string") {
    return { id: "", markdown: "" };
  }
  return tableBlock;
}

/**
 * 根据文档id在文档中插入表格块 /api/block/insertBlock
 * @return 块id
 */
export async function insertTableBlock(
  docId: string,
  mkStr: string,
): Promise<string> {
  const resp = await postSiyuanApi("/api/block/insertBlock", {
    dataType: "markdown",
    data: mkStr,
    nextID: "",
    previousID: "",
    parentID: docId,
  });
  return getOperationId(resp, "插入表格块");
}

/**
 * 根据文档id在文档中插入 markdown 块 /api/block/insertBlock
 * @return 块id
 */
export async function insertMarkdownBlock(
  docId: string,
  mkStr: string,
): Promise<string> {
  const resp = await postSiyuanApi("/api/block/insertBlock", {
    dataType: "markdown",
    data: mkStr,
    nextID: "",
    previousID: "",
    parentID: docId,
  });
  return getOperationId(resp, "插入 Markdown 块");
}

/**
 * 更新块内容 /api/block/updateBlock
 * @return 块id
 */
export async function updateBlockContent(
  blockId: string,
  mkStr: string,
): Promise<string> {
  const resp = await postSiyuanApi("/api/block/updateBlock", {
    dataType: "markdown",
    data: mkStr,
    id: blockId,
  });
  return getOperationId(resp, "更新块内容");
}

/**
 * 删除块 /api/block/deleteBlock
 */
export async function deleteBlock(blockId: string): Promise<boolean> {
  const resp = await postSiyuanApi("/api/block/deleteBlock", {
    id: blockId,
  });
  return resp?.code === 0;
}

/**
 * 执行 sql /api/query/sql
 */
async function executeSql(sql: string): Promise<IWebSocketData | undefined> {
  return postSiyuanApi("/api/query/sql", { stmt: sql });
}

/**
 * 锁定文档 api/attr/setBlockAttrs
 * 通过设置块属性来锁定文档，防止编辑
 * @param {string} id 文档id
 * @return {boolean} 是否锁定成功
 */
export async function blockDocument(id: string): Promise<boolean> {
  const resp = await postSiyuanApi("/api/attr/setBlockAttrs", {
    id: id,
    attrs: { "custom-sy-readonly": "true" },
  });
  return resp?.code === 0;
}

/**
 * 设置块属性 /api/attr/setBlockAttrs
 */
export async function setBlockAttrs(
  id: string,
  attrs: Record<string, string>,
): Promise<boolean> {
  const resp = await postSiyuanApi("/api/attr/setBlockAttrs", {
    id,
    attrs,
  });
  return resp?.code === 0;
}

/**
 * 通过块自定义属性读取记账记录 /api/query/sql
 */
export async function getBookkeepingRecordsByPledge(
  storageMode?: string,
  storageRootId?: string,
): Promise<(BookkeepingRecord & { blockId?: string; documentId?: string; displayTime?: string; createdAt?: string })[]> {
  if (storageMode !== "central" && storageMode !== "date") return [];

  const sql = `SELECT block_id,value FROM attributes WHERE name = 'custom-pledge' AND value LIKE '%"storageMode":"${storageMode}"%'`;
  const resp = await executeSql(sql);

  if (!resp || resp.code !== 0 || !Array.isArray(resp.data)) {
    return [];
  }

  const records: (BookkeepingRecord & { blockId?: string; documentId?: string; displayTime?: string; createdAt?: string })[] = [];
  for (const item of resp.data) {
    try {
      const data = JSON.parse(item.value);
      if (!data?.date || !data?.parentName || !data?.childName) continue;
      records.push({
        type: data.type,
        date: data.date,
        parentName: data.parentName,
        childName: data.childName,
        amount: Number(data.amount) || 0,
        remark: data.remark || "",
        ...(data.storageRootId ? { storageRootId: data.storageRootId } : {}),
        blockId: data.blockId || item.block_id,
        ...(data.documentId ? { documentId: data.documentId } : {}),
        ...(data.displayTime ? { displayTime: data.displayTime } : {}),
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      });
    } catch (error) {
      console.error("解析记账记录属性失败", { item, error });
    }
  }

  if (storageRootId?.trim()) {
    const rootId = storageRootId.trim();
    const rootLocation = storageMode === "central"
      ? await getPathAndNoteId(rootId)
      : undefined;
    const rootPath = rootLocation?.path.replace(/\/+$/, "") || "";
    const locationCache = new Map<string, { notebook: string; path: string }>();
    const scopedRecords: typeof records = [];

    for (const record of records) {
      if (record.storageRootId) {
        if (record.storageRootId === rootId) scopedRecords.push(record);
        continue;
      }

      // 兼容历史记录：旧属性没有 storageRootId 时，通过文档位置判断归属。
      if (!record.documentId) continue;
      let location = locationCache.get(record.documentId);
      if (!location) {
        location = await getPathAndNoteId(record.documentId);
        locationCache.set(record.documentId, location);
      }
      if (!location.notebook) continue;

      if (storageMode === "date") {
        if (location.notebook === rootId) scopedRecords.push(record);
        continue;
      }

      if (
        rootLocation?.notebook
        && rootPath
        && location.notebook === rootLocation.notebook
        && (location.path === rootPath || location.path.startsWith(`${rootPath}/`))
      ) {
        scopedRecords.push(record);
      }
    }

    return scopedRecords.sort((a, b) => b.date.localeCompare(a.date));
  }

  return records.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 获取当前系统时间 /api/system/currentTime
 */
export async function getCurrentTime() {
  return (await getCurrentDateTime()).date;
}

/**
 * 获取当前系统日期时间 /api/system/currentTime
 */
export async function getCurrentDateTime(): Promise<{ date: string; time: string; iso: string; dateObj: Date }> {
  const resp = await postSiyuanApi("/api/system/currentTime");
  const dateObj = resp?.code === 0 ? parseSiyuanCurrentTime(resp.data) : new Date();
  return {
    date: formatLocalDate(dateObj),
    time: formatLocalTime(dateObj),
    iso: dateObj.toISOString(),
    dateObj,
  };
}

function parseSiyuanCurrentTime(value: unknown): Date {
  const timestamp = Number(value);
  if (Number.isFinite(timestamp)) {
    const normalizedTimestamp = timestamp < 100000000000 ? timestamp * 1000 : timestamp;
    return new Date(normalizedTimestamp);
  }

  const dateObj = new Date(String(value));
  return Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
}

function formatLocalDate(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLocalTime(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 根据文档编号获取全年数据
export async function getLedgerListByYearDocId(
  yearDocId: string,
  settingConfData: SettingConfig,
): Promise<LedgerItem[]> {
  if (yearDocId) {
    let { markdown: tableBlockMarkdown } =
      await getTableBlockByDocId(yearDocId);
    const accountList: LedgerItem[] = tableMD2json(
      tableBlockMarkdown,
      settingConfData.config,
    );
    return accountList;
  } else {
    return [];
  }
}

// 根据年份获取年文件id列表, 降序, 文件名称为 xxxx.sy, 例如 2025.sy
export async function getYearDocs(documentId: string): Promise<IFile[]> {
  function extractYear(file: IFile): number {
    return Number(file.name.replace(".sy", ""));
  }
  const fileList = await getFileTreeById(documentId);
  return fileList
    .sort((a, b) => extractYear(b) - extractYear(a));
}
