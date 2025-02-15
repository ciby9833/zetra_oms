<template>
  <el-config-provider :locale="locale">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

const locale = zhCn;
const authStore = useAuthStore();

// 在应用挂载时初始化认证状态
onMounted(async () => {
  if (authStore.token) {
    try {
      await authStore.init();
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
    }
  }
});
</script>
