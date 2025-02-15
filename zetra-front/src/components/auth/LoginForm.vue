<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="form.email" type="email" placeholder="请输入邮箱" />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="form.password"
        type="password"
        placeholder="请输入密码"
        show-password
      />
    </el-form-item>

    <el-form-item label="验证码" prop="captcha">
      <div class="captcha-container">
        <el-input
          v-model="form.captcha"
          placeholder="请输入验证码"
          @focus="showCaptcha = true"
        >
          <template #append>
            <Captcha
              :email="form.email"
              :show="showCaptcha"
              ref="captchaRef"
            />
          </template>
        </el-input>
      </div>
    </el-form-item>

    <el-form-item>
      <div class="button-group">
        <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
        <el-button @click="goToRegister">注册账号</el-button>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import Captcha from '@/components/common/Captcha.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const formRef = ref<FormInstance>();
const loading = ref(false);
const captchaRef = ref();
const showCaptcha = ref(false);

const form = ref({
  email: '',
  password: '',
  captcha: ''
});

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码长度为4位', trigger: 'blur' }
  ]
};

const handleCaptchaFocus = () => {
  if (!form.value.email) {
    ElMessage.warning('请先输入邮箱');
    return;
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.value.email)) {
    ElMessage.warning('请输入正确的邮箱格式');
    return;
  }

  showCaptcha.value = true;
};

const handleLogin = async () => {
  if (!formRef.value) return;

  try {
    // 先验证表单
    await formRef.value.validate();
    loading.value = true;

    const response = await authApi.login(form.value);
    console.log('Login response:', response);

    if (response.data.success) {
      const { token, user } = response.data.data;

      // 先设置 token
      authStore.token = token;
      localStorage.setItem('token', token);

      // 再设置用户信息
      authStore.setUser(user);

      ElMessage.success('登录成功');

      // 等待状态更新完成
      await nextTick();

      // 强制刷新路由状态
      await router.replace('/');
      await router.push({
        path: '/dashboard',
        replace: true
      });
    } else {
      ElMessage.error(response.data.message || '登录失败');
    }
  } catch (error: any) {
    console.error('Login failed:', error);
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message);
    } else {
      ElMessage.error('登录失败，请检查账号密码');
    }
  } finally {
    loading.value = false;
  }
};

const handleCaptchaRefresh = () => {
  form.value.captcha = '';
};

const goToRegister = () => {
  router.push({ name: 'register' });
};
</script>

<style scoped>
.captcha-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.button-group {
  display: flex;
  gap: 16px;
  justify-content: flex-start;
}
</style>
