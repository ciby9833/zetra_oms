<template>
  <el-dialog
    v-model="dialogVisible"
    title="导入物料"
    width="500px"
    @close="handleClose"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="模板">
        <el-button type="primary" link @click="downloadTemplate">
          下载导入模板
        </el-button>
      </el-form-item>
      <el-form-item label="选择文件">
        <el-upload
          ref="uploadRef"
          class="material-import"
          action="#"
          name="file"
          :auto-upload="false"
          :on-change="handleFileChange"
          :limit="1"
          accept=".xlsx,.xls"
          :http-request="customUpload"
          :before-upload="handleBeforeUpload"
        >
          <template #trigger>
            <el-button type="primary">选择文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">
              请上传 Excel 文件（.xlsx/.xls），大小不超过 5MB
            </div>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="handleUpload"
        >
          确定导入
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UploadInstance, UploadFile, UploadRawFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import * as materialApi from '@/api/material'
import request from '@/utils/request'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
  (e: 'importSuccess'): void
}>()

const uploadRef = ref<UploadInstance>()
const selectedFile = ref<File | null>(null)
const uploading = ref(false)

const authStore = useAuthStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 文件选择前处理
const handleBeforeUpload = (file: UploadRawFile) => {
  // 验证文件类型
  const isExcel = /\.(xlsx|xls)$/.test(file.name)
  if (!isExcel) {
    ElMessage.error('只能上传 Excel 文件!')
    return false
  }

  // 验证文件大小 (5MB)
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('文件大小不能超过 5MB!')
    return false
  }

  return true
}

// 文件选择处理
const handleFileChange = (file: any) => {
  // 如果 file.raw 存在，则使用 file.raw，否则使用 file 本身
  selectedFile.value = file.raw || file;
}

// Updated customUpload function for handling the file upload
const customUpload = async (option: any) => {
  if (!selectedFile.value) {
    ElMessage.error('请选择要上传的文件');
    option.onError('未找到上传的文件');
    return;
  }
  const formData = new FormData();
  formData.append('file', selectedFile.value);

  // 从 authStore 或 localStorage 中获取 token（可根据项目实际情况调整）
  const token = authStore.token || localStorage.getItem('token');
  if (!token) {
    ElMessage.error('缺少认证令牌，请先登录');
    option.onError('缺少认证令牌');
    return;
  }
  const xhr = new XMLHttpRequest();
  xhr.open('POST', import.meta.env.VITE_API_BASE_URL + '/material/import');
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const result = JSON.parse(xhr.responseText);
      // 如果后端返回 success 为 false 表示部分数据导入失败，则只反馈一条错误摘要
      if (!result.success) {
        let summary = '物料导入失败';
        if (result.errors && result.errors.length > 0) {
          summary = `物料导入失败，例如第${result.errors[0].row}行：${result.errors[0].error}`;
        }
        option.onError(summary);
      } else {
        option.onSuccess(result);
      }
    } else {
      option.onError(xhr.responseText);
    }
  };
  xhr.onerror = () => {
    option.onError('上传失败');
  };
  xhr.send(formData);
};

// Example (or updated) handleUpload function that calls the custom upload
const handleUpload = () => {
  if (!selectedFile.value) {
    ElMessage.error('请选择要上传的文件');
    return;
  }
  // 从 auth store 获取 token
  const token = authStore.token;
  if (!token) {
    ElMessage.error('未登录或token不存在，请先登录');
    return;
  }
  // Invoke the customUpload function with the necessary file and callbacks
  customUpload({
    file: selectedFile.value, // The file selected by the user
    onSuccess: (data: any) => {
      ElMessage.success('导入成功');
      // Additional success handling if needed...
    },
    onError: (error: any) => {
      // Show the error returned from the backend
      ElMessage.error(error.response?.data?.message || '上传失败');
    }
  });
};

// 下载模板
const downloadTemplate = async () => {
  try {
    const response = await materialApi.downloadTemplate()
    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('下载模板失败，请稍后重试')
  }
}



// 关闭处理
const handleClose = () => {
  uploadRef.value?.clearFiles()
  selectedFile.value = null
}

const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件');
    return;
  }
  // 构造 FormData 对象
  const formData = new FormData();
  formData.append('file', selectedFile.value);
  try {
    // 调用导入 API，同时与货区管理功能保持一致
    const res = await materialApi.importFile(formData);
    // 如果返回的所有行均导入成功，则提示成功
    ElMessage.success('导入成功');
    // 关闭弹窗并清空上传组件
    dialogVisible.value = false;
    uploadRef.value?.clearFiles();
    selectedFile.value = null;
    // 触发刷新数据操作
    emit('importSuccess');  // 如果父组件未监听本事件，也可以调用全局刷新函数，例如：refreshMaterialList();
  } catch (error: any) {
    // 解析错误消息，若包含 "errors" 数组，则只显示前三条错误信息
    let errorMsg = '';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.errors && Array.isArray(parsed.errors)) {
        errorMsg = parsed.errors.slice(0, 3).join('；');
      } else {
        errorMsg = error.message;
      }
    } catch (e) {
      errorMsg = error.message;
    }
    ElMessage.error(errorMsg);
  }
};
</script>

<style lang="scss" scoped>
.material-import {
  :deep(.el-upload-list) {
    margin-top: 10px;
  }

  :deep(.el-upload__tip) {
    margin-top: 8px;
    line-height: 1.4;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
