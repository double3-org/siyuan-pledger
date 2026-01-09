<template>
  <div ref="chartRef"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import {
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  TooltipComponent,
  GridComponent,
  LineChart,
  CanvasRenderer
]);

const props = defineProps<{
  lineData: { time: string; value: number }[];
}>();

const chartRef = ref<HTMLDivElement | null>(null);
type EChartsInstance = ReturnType<typeof echarts.init>;

let chartInstance: EChartsInstance | null = null;

/**
 * 初始化图表
 */
function initChart() {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  renderChart();
}

/**
 * 渲染图表
 */
function renderChart() {
  if (!chartInstance || !props.lineData) return;

  const values = props.lineData.map(d => d.value);
  const minVal = Math.min(...values); 
  const maxVal = Math.max(...values) ;

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'time' },
    yAxis: {
      type: 'value',
      axisLine: { show: false },  // 轴线
      axisTick: { show: false },  // 刻度
      axisLabel: { show: false },  // 标签
      splitNumber: 4,
      min: (v: any) => v.min - (v.max - v.min) * 0.1,
      max: (v: any) => v.max
    },
    grid: {
      top: 16,
      bottom: 30,
      left: 10,
      right: 20,
      containLabel: true
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: props.lineData.map(item => [item.time, item.value])
      }
    ]
  }
  chartInstance.setOption(option, true);
}

/**
 * 监听 data 变化（接口返回后自动更新）
 */
watch(
  () => props.lineData,
  () => {
    renderChart();
  },
  { deep: true }
);

/**
 * resize 自适应
 */
function resizeChart() {
  chartInstance?.resize();
}

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  chartInstance?.dispose();
  chartInstance = null;
});

</script>

<style scoped></style>
