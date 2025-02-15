<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人信息</span>
          <el-button type="primary" @click="handleEdit">编辑</el-button>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="用户名">
          {{ userInfo.username }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ userInfo.email }}
        </el-descriptions-item>
        <el-descriptions-item label="账户类型">
          {{ userInfo.accountType }}
        </el-descriptions-item>
        <el-descriptions-item label="用户角色">
          {{ userInfo.userRole }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ProfileView'
});
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const userInfo = computed(() => authStore.user || {});

function handleEdit() {
  // TODO: 实现编辑功能
}
</script>

<style scoped lang="scss">
.profile-container {
  padding: 20px;

  .profile-card {
    max-width: 800px;
    margin: 0 auto;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
}
</style>
