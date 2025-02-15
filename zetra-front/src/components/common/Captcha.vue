<template>
  <div
    v-if="show"
    class="captcha-image"
    v-html="svg"
    @click="refresh"
    title="点击刷新验证码"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { authApi } from '@/api/auth';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  email: string;
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'error', message: string): void;
}>();

const svg = ref('');

const refresh = async () => {
  if (!props.email) {
    ElMessage.warning('请先输入邮箱');
    return;
  }

  try {
    const response = await authApi.getCaptcha(props.email);
    svg.value = response;
  } catch (error) {
    console.error('Get captcha error:', error);
    emit('error', '获取验证码失败');
  }
};

// 监听 show 和 email 的变化
watch(
  () => [props.show, props.email],
  async ([show, email]) => {
    if (show && email) {
      await refresh();
    }
  }
);

// 暴露刷新方法给父组件
defineExpose({
  refresh
});
</script>

<style scoped>
.captcha-image {
  width: 120px;
  height: 46px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #fff;
  transition: all 0.3s;
}

.captcha-image:hover {
  border-color: #409eff;
}

:deep(svg) {
  width: 100%;
  height: 100%;
  padding: 2px;
}
</style>
