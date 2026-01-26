export async function chatWithQwen(
  config: SettingConfig,
  itemName: string,
  file: File,
) {
  // 将图片转为 base64 编码
  const reader = new FileReader();
  reader.readAsDataURL(file);
  // 等待图片加载完成
  await new Promise((resolve) => (reader.onloadend = resolve));
  const base64Image = reader.result as string;
  // 调用通义千问 API
  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `${base64Image}` },
              },
              { type: "text", text: getPrompt(config, itemName) },
            ],
          },
        ],
        enable_thinking: false, // 关闭思考模式
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// 获取提示词
export function getPrompt(config: SettingConfig, itemName: string) {
  const configObj = JSON.parse(config.config);
  const types =
    configObj
      .find((item: LedgerItem) => item?.name === itemName)
      ?.children?.map((child: LedgerItem) => child?.name)
      ?.filter(Boolean) ?? [];
  let res = `你是一个图像内容分析器，请根据以下规则识别并每一项的金额。
${types.join(", ")}
规则：
1. 如果没有请用 0.00 替代
2. 去掉千分符
3. 无法判断的对象请忽略，必须与我给的你名称一致才取数，没有的项不需要输出
4. 只返回 JSON 不要输出任何解释
返回示例：
{
  "${types[0]}": number,
  "${types[1]}": number,
  ...
}`;
  return res;
}
