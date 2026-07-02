import { fetchSyncPost, IWebSocketData, IFile } from "siyuan";
import { tableMD2json } from "../utils/pl-utils.js";

/**
 * 根据文档id获取文档路径 和 notebook id /api/filetree/getPathByID
 * @param {string} id 文档id
 * @return {notebook: string; path: string} 笔记本id 和 文件路径
 */
export async function getPathAndNoteId(
  id: string,
): Promise<{ notebook: string; path: string }> {
  const resp = await fetchSyncPost("/api/filetree/getPathByID", { id });
  if (resp.code !== 0) {
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
  const resp = await fetchSyncPost("/api/filetree/getHPathByID", { id });
  if (resp.code !== 0) {
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
  const docPathResp = await getPathAndNoteId(id);
  const fileTreeResp = await fetchSyncPost("/api/filetree/listDocsByPath", {
    notebook: docPathResp.notebook,
    path: docPathResp.path,
  });
  if (fileTreeResp.code !== 0) {
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
  const resp = await fetchSyncPost("/api/filetree/createDocWithMd", {
    notebook: docPathResp.notebook,
    path: docHPath + "/" + title,
    markdown: "",
  });
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
  const resp = await fetchSyncPost("/api/filetree/createDocWithMd", {
    notebook,
    path,
    markdown,
  });
  if (resp.code !== 0) {
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
  const resp = await fetchSyncPost("/api/filetree/getIDsByHPath", {
    notebook,
    path,
  });
  if (resp.code !== 0) {
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
  const resp = await fetchSyncPost("/api/notebook/getNotebookConf", { notebook });
  if (resp.code !== 0) {
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
  const sql = `SELECT id,markdown FROM blocks WHERE root_id = '${id}' AND type = 't' limit 1`;
  const resp = await executeSql(sql);
  if (resp.code !== 0 || resp.data.length < 1) {
    return { id: "", markdown: "" };
  }
  return resp.data[0];
}

/**
 * 根据文档id在文档中插入表格块 /api/block/insertBlock
 * @return 块id
 */
export async function insertTableBlock(
  docId: string,
  mkStr: string,
): Promise<string> {
  const resp = await fetchSyncPost("/api/block/insertBlock", {
    dataType: "markdown",
    data: mkStr,
    nextID: "",
    previousID: "",
    parentID: docId,
  });
  return resp.data[0].doOperations[0].id;
}

/**
 * 根据文档id在文档中插入 markdown 块 /api/block/insertBlock
 * @return 块id
 */
export async function insertMarkdownBlock(
  docId: string,
  mkStr: string,
): Promise<string> {
  const resp = await fetchSyncPost("/api/block/insertBlock", {
    dataType: "markdown",
    data: mkStr,
    nextID: "",
    previousID: "",
    parentID: docId,
  });
  return resp.data[0].doOperations[0].id;
}

/**
 * 更新块内容 /api/block/updateBlock
 * @return 块id
 */
export async function updateBlockContent(
  blockId: string,
  mkStr: string,
): Promise<string> {
  const resp = await fetchSyncPost("/api/block/updateBlock", {
    dataType: "markdown",
    data: mkStr,
    id: blockId,
  });
  return resp.data[0].doOperations[0].id;
}

/**
 * 删除块 /api/block/deleteBlock
 */
export async function deleteBlock(blockId: string): Promise<boolean> {
  const resp = await fetchSyncPost("/api/block/deleteBlock", {
    id: blockId,
  });
  return resp.code === 0;
}

/**
 * 执行 sql /api/query/sql
 */
async function executeSql(sql: string): Promise<IWebSocketData> {
  return fetchSyncPost("/api/query/sql", { stmt: sql });
}

/**
 * 锁定文档 api/attr/setBlockAttrs
 * 通过设置块属性来锁定文档，防止编辑
 * @param {string} id 文档id
 * @return {boolean} 是否锁定成功
 */
export async function blockDocument(id: string): Promise<boolean> {
  const resp = await fetchSyncPost("/api/attr/setBlockAttrs", {
    id: id,
    attrs: { "custom-sy-readonly": "true" },
  });
  return resp.code === 0;
}

/**
 * 设置块属性 /api/attr/setBlockAttrs
 */
export async function setBlockAttrs(
  id: string,
  attrs: Record<string, string>,
): Promise<boolean> {
  const resp = await fetchSyncPost("/api/attr/setBlockAttrs", {
    id,
    attrs,
  });
  return resp.code === 0;
}

/**
 * 通过块自定义属性读取记账记录 /api/query/sql
 */
export async function getBookkeepingRecordsByPledge(storageMode?: string): Promise<(BookkeepingRecord & { blockId?: string; documentId?: string; displayTime?: string; createdAt?: string })[]> {
  const sql = storageMode
    ? `SELECT block_id,value FROM attributes WHERE name = 'custom-pledge' AND value LIKE '%"storageMode":"${storageMode}"%'`
    : "SELECT block_id,value FROM attributes WHERE name = 'custom-pledge'";
  const resp = await executeSql(sql);

  if (resp.code !== 0 || !Array.isArray(resp.data)) {
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
        blockId: data.blockId || item.block_id,
        ...(data.documentId ? { documentId: data.documentId } : {}),
        ...(data.displayTime ? { displayTime: data.displayTime } : {}),
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      });
    } catch (error) {
      console.error("解析记账记录属性失败", { item, error });
    }
  }

  return records.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 获取当前系统时间 /api/system/currentTime
 */
export async function getCurrentTime() {
  const resp = await fetchSyncPost("/api/system/currentTime");
  if (resp.code === 0) {
    return new Date(resp.data).toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
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
