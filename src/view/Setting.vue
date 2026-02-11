<template>
  <div class="pl-setting-main">
    <div class="pl-setting-form">
      <label class="col-span-2 text-sm font-medium text-gray-700">
        数据存放位置
        <p class="text-xs text-gray-500">请复制文档id到此处, 请不要频繁调整该配置</p>
      </label>

      <div class="col-span-4">
        <input type="text" v-model="localSetting.documentId" placeholder="文档id" class="pl-form-input" />
      </div>

      <label class="col-span-2 text-sm font-medium text-gray-700">
        目标金额
        <p class="text-xs text-gray-500">请填写目标金额, 默认100W</p>
      </label>

      <div class="col-span-4">
        <input type="text" v-model="localSetting.planNum" placeholder="目标金额" class="pl-form-input" />
      </div>

      <label class="col-span-2 text-sm font-medium text-gray-700">
        配置
        <p class="text-xs text-gray-500">
          请按照如下格式填入配置
        </p>
        <pre class="overflow-x-auto">
<code class="text-xs text-gray-500">[{
  name: '支付宝',
  icon: 'iconAlipayIcon',
  children: [
    { name: '余额宝' },
    { name: '定期' }
  ]
}]</code></pre>
      </label>

      <div class="col-span-4">
        <textarea v-model="localSetting.config" type="text" placeholder="请填入配置" class="pl-form-textarea" />
      </div>

      <label class="col-span-2 text-sm font-medium text-gray-700">
        AI 配置
        <p class="text-xs text-gray-500">
          本插件调用阿里云通义千问, 请填写需要调用的模型名称和 API Key
        </p>
      </label>

      <div class="col-span-4">
        <div class="mb-2">
          <input type="text" v-model="localSetting.modelName" placeholder="模型名称" class="pl-form-input"
            style="margin-bottom: 0.5rem;" />
        </div>
        <input type="text" v-model="localSetting.apiKey" placeholder="API Key" class="pl-form-input" />
      </div>
    </div>

    <div class="pl-setting-footer">
      <button class="pl-button" @click="closeSetting">取消</button>
      <button class="pl-button" style="background-color: #422ad5; color: #fff;" @click="saveSettingData">保存</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  // 关闭设置面板
  closeSetting: () => void,
  // 保存设置
  saveSetting: (settingData: SettingConfig) => void,
  settingConfData: SettingConfig
}>();

// 初始化本地设置数据
const localSetting = ref<SettingConfig>({
  ...props.settingConfData
});

// 保存设置数据
const saveSettingData = () => {
  props.saveSetting(localSetting.value);
};
</script>

<style scoped lang="css">
.pl-setting-main {
  padding: 1rem 1.5rem;
}

.pl-setting-form {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 1rem;
}

.pl-setting-form label {
  font-weight: bold;
}

.pl-setting-form p,
.pl-setting-form pre {
  font-weight: lighter;
  color: #9ca3af;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.pl-setting-form input,
.pl-setting-form textarea {
  width: 66%;
}

.pl-setting-form textarea {
  height: 88%;
}

.pl-setting-footer {
  display: flex;
  justify-content: end;
  gap: 1rem;
}
</style>
