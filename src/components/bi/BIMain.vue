<template>
  <div class="card bg-base-100 card-border border-base-300 w-full py-2 px-4">
    <div class="card-title">
      <slot name="title"></slot>
    </div>
    <div class="card-body p-0">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="css"></style>
