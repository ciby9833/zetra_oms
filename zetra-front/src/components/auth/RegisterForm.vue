<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
    <el-form-item label="用户名" prop="username">
      <el-input v-model="form.username" placeholder="请输入用户名" />
    </el-form-item>

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

    <el-form-item label="确认密码" prop="confirmPassword">
      <el-input
        v-model="form.confirmPassword"
        type="password"
        placeholder="请再次输入密码"
        show-password
      />
    </el-form-item>

    <el-form-item label="验证码" prop="captcha">
      <div class="captcha-container">
        <el-input
          v-model="form.captcha"
          placeholder="请输入验证码"
          @focus="handleCaptchaFocus"
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
        <el-button type="primary" @click="handleRegister">注册</el-button>
        <el-button @click="goToLogin">返回登录</el-button>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { authApi } from '@/api/auth';
import Captcha from '@/components/common/Captcha.vue';

const router = useRouter();
const formRef = ref<FormInstance>();
const captchaRef = ref();
const showCaptcha = ref(false);

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  captcha: ''
});

const validatePass = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请输入密码'));
  } else if (value.length < 6 || value.length > 20) {
    callback(new Error('密码长度在 6 到 20 个字符'));
  } else {
    if (form.value.confirmPassword !== '') {
      formRef.value?.validateField('confirmPassword');
    }
    callback();
  }
};

const validatePass2 = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== form.value.password) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [{ validator: validatePass, trigger: 'blur' }],
  confirmPassword: [{ validator: validatePass2, trigger: 'blur' }],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码长度为4位', trigger: 'blur' }
  ]
};

const handleRegister = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    const { confirmPassword, ...registerData } = form.value;
    const response = await authApi.register(registerData);

    if (response.data.success) {
      ElMessage.success('注册成功，请登录');
      router.push('/login');
    }
  } catch (error: any) {
    console.error('Register error:', error);
    ElMessage.error(error.response?.data?.message || '注册失败');
  }
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

const refreshCaptcha = () => {
  form.value.captcha = '';
};

const goToLogin = () => {
  router.push({ name: 'login' });
};
</script>

<style scoped>
.captcha-container {
  display: flex;
  gap: 12px;  /* 增加间距 */
  align-items: center;  /* 垂直居中对齐 */
}

.button-group {
  display: flex;
  gap: 16px;
  justify-content: flex-start;
}
</style>
