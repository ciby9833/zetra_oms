<template>
  <div class="auth-container">
    <div class="auth-content">
      <el-card class="auth-card">
        <template #header>
          <h2 class="card-title">用户注册</h2>
        </template>
        <register-form />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import RegisterForm from '@/components/auth/RegisterForm.vue';
</script>

<style scoped>
.auth-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f5f7fa;
  overflow: auto;
}

.auth-content {
  min-height: 100%;
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-card {
  width: 100%;
  max-width: 480px;
  margin: auto;
}

.card-title {
  margin: 0;
  text-align: center;
  font-size: 24px;
  color: #303133;
}

/* 响应式布局 */
@media (max-width: 576px) {
  .auth-content {
    padding: 20px 16px;
  }

  .auth-card {
    max-width: 100%;
  }
}
</style>
