<template>
  <div class="change-password">
    <h2>修改密码</h2>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="password-form"
    >
      <el-form-item label="旧密码" prop="oldPassword">
        <el-input
          v-model="form.oldPassword"
          type="password"
          show-password
          placeholder="请输入旧密码"
        />
      </el-form-item>

      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          show-password
          placeholder="请输入新密码"
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          placeholder="请再次输入新密码"
        />
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          确认修改
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ChangePasswordView'
});
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { authApi } from '@/api/auth';

const router = useRouter();
const authStore = useAuthStore();
const formRef = ref<FormInstance>();
const loading = ref(false);

const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const validatePass = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请输入新密码'));
  } else if (value === form.value.oldPassword) {
    callback(new Error('新密码不能与旧密码相同'));
  } else if (value.length < 6 || value.length > 20) {
    callback(new Error('密码长度必须在6-20个字符之间'));
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
  } else if (value !== form.value.newPassword) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

const rules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ],
  newPassword: [
    { validator: validatePass, trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: validatePass2, trigger: 'blur' }
  ]
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    loading.value = true;

    const response = await authApi.changePassword({
      email: authStore.user?.email || '',
      oldPassword: form.value.oldPassword,
      newPassword: form.value.newPassword,
      confirmPassword: form.value.confirmPassword
    });

    if (response.data.success) {
      ElMessage.success('密码修改成功，请重新登录');
      await authStore.logout();
      router.push('/login');
    } else {
      throw new Error(response.data.message || '修改密码失败');
    }
  } catch (error: any) {
    console.error('Change password error:', error);
    ElMessage.error(error.response?.data?.message || error.message || '修改密码失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.change-password {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.password-form {
  max-width: 500px;
  margin-top: 20px;
}
</style>
