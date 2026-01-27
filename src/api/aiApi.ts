export async function chatWithQwen(
  config: SettingConfig,
  prompt: string,
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
              { type: "text", text: prompt },
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
  // 提取 JSON 字符串
  return data.choices[0].message.content.replace(/```json|```/g, '').trim();
}
