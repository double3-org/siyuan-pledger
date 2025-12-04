import { fetchSyncPost } from "siyuan";


/**
 * 关闭插件
 */
export async function closePlugin() {
    const param = {
        "packageName":"siyuan-pledger",
        "enabled":false,
        "frontend":"desktop",
        // "app":"9i2lp"
    };
  return await fetchSyncPost("http://127.0.0.1:49930/api/petal/setPetalEnabled", param);
}