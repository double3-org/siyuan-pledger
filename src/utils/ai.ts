// 获取提示词
export function getPrompt(config: SettingConfig, itemName: string) {
  const configObj = JSON.parse(config.config);
  const types =
    configObj
      .find((item: LedgerItem) => item?.name === itemName)
      ?.children?.map((child: LedgerItem) => child?.name)
      ?.filter(Boolean) ?? [];
  let res = `你将接收到一张图片。

任务：
仅从图片中识别并提取数值信息，不要生成或修改任何图片。

需要识别的字段仅限于：
${types.join(", ")}

识别规则：
1. 只在图片中明确出现对应文字标签时，才提取其数值
2. 无法明确对应的字段，返回 0.00
3. 去掉千分符，仅保留数字
4. 不要推测、不补全、不计算
5. 严禁输出任何解释性文字

返回格式：
{
  "${types[0]}": number,
  "${types[1]}": number,
  ...
}`;
  return res;
}
