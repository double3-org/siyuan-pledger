import { fetchSyncPost, IWebSocketData, IFile } from "siyuan";
import { type AstNode } from "../utils/parse-ast-tuil.ts";

/**
 * 根据文档id获取文档路径 和 notebook id /api/filetree/getPathByID
 * @param {string} id 文档id
 * @return {notebook: string; path: string} 笔记本id 和 文件路径
 */
export async function getPathAndNoteId(
  id: string
): Promise<{ notebook: string; path: string }> {
  var resp = await fetchSyncPost("/api/filetree/getPathByID", { id });
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
  var resp = await fetchSyncPost("/api/filetree/getHPathByID", { id });
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
  var docPathResp = await getPathAndNoteId(id);
  var fileTreeResp = await fetchSyncPost("/api/filetree/listDocsByPath", {
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
  pDocId: string
): Promise<string> {
  var docHPath = await getHPath(pDocId);
  var docPathResp = await getPathAndNoteId(pDocId);
  var resp = await fetchSyncPost("/api/filetree/createDocWithMd", {
    notebook: docPathResp.notebook,
    path: docHPath + "/" + title,
    markdown: "",
  });
  return resp.data;
}

/**
 * 根据文档id, 获取第一个表格块信息, 包含 id 和 markdown
 * 第一个表格, 年度汇总表
 * 第二个表格, 详情表
 * SELECT id,markdown FROM blocks WHERE root_id = '20251225201147-xfwjyyj' AND type = 't' limit 1
 */
export async function getTableBlockByDocId(
  id: string,
  index: number
): Promise<{ id: string; markdown: string }> {
  const sql = `SELECT id,markdown FROM blocks WHERE root_id = '${id}' AND type = 't' limit ${index}`;
  const resp = await executeSql(sql);
  if (resp.code !== 0 || resp.data.length < index) {
    return { id: "", markdown: "" };
  }
  return resp.data[index - 1];
}

/**
 * 根据文档id在文档中插入表格块 /api/block/insertBlock
 * @return 块id
 */
export async function insertTableBlock(
  docId: string,
  mkStr: string
): Promise<string> {
  var resp = await fetchSyncPost("/api/block/insertBlock", {
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
  mkStr: string
): Promise<string> {
  var resp = await fetchSyncPost("/api/block/updateBlock", {
    dataType: "markdown",
    data: mkStr,
    id: blockId,
  });
  return resp.data[0].doOperations[0].id;
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
  var resp = await fetchSyncPost("/api/attr/setBlockAttrs", {
    id: id,
    attrs: { "custom-sy-readonly": "true" },
  });
  return resp.code === 0;
}

/**
 * 获取当前系统时间 /api/system/currentTime
 */
export async function getCurrentTime() {
  var resp = await fetchSyncPost("/api/system/currentTime");
  if (resp.code === 0) {
    return new Date(resp.data).toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 *  ======================================================================
 */

/**
 * 获取文档内容根据文档id
 * 1、getPathAndNoteId
 * 2、根据文件路径获取文件内容 /api/file/getFile
 * @param id 文档id
 * @return 文档内容, Children 数组
 */
export async function getDocContentById(id: string): Promise<AstNode | null> {
  var docPathResp = await getPathAndNoteId(id);
  var resp = (await fetchSyncPost("/api/file/getFile", {
    path: "data/" + docPathResp.notebook + "/" + docPathResp.path,
  })) as IWebSocketData & AstNode;
  if (!resp) {
    return null;
  }
  return resp;
}

/**
 * 获取块 kramdown 源码 /api/block/getBlockKramdown
 */
export async function getBlockKramdownSrcById(id: string): Promise<string> {
  var resp = await fetchSyncPost("/api/block/getBlockKramdown", { id });
  if (resp.code !== 0) {
    return "";
  }
  return resp.data.kramdown;
}
