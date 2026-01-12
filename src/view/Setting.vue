<template>
  <div class="double3-main p-6 bg-white rounded-lg shadow-sm">
    <div class="grid grid-cols-6 gap-4 items-center items-stretch">

      <label class="col-span-2 text-sm font-medium text-gray-700">
        数据存放位置
        <p class="text-xs text-gray-500">请复制文档id到此处, 请不要频繁调整该配置</p>
      </label>

      <div class="col-span-4">
        <input type="text" v-model="localSetting.documentId" placeholder="文档id" class="w-full h-10 px-3 input" />
      </div>

      <label class="col-span-2 text-sm font-medium text-gray-700">
        目标金额
        <p class="text-xs text-gray-500">请填写目标金额, 默认100W</p>
      </label>

      <div class="col-span-4">
        <input type="text" v-model="localSetting.planNum" placeholder="目标金额" class="w-full h-10 px-3 input" />
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
        <textarea v-model="localSetting.config" type="text" placeholder="请填入配置"
          class="w-full px-3 textarea min-h-[180px]" />
      </div>
    </div>

    <div class="flex justify-end gap-5">
      <button class="btn btn-outline btn-sm" @click="closeSetting">取消</button>
      <button class="btn btn-info btn-sm" @click="saveSettingData">保存</button>
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

<style lang="css"></style>
