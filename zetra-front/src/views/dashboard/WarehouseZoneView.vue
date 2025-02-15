<template>
  <div class="zone-view">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="仓库" class="form-item-medium">
          <el-select
            v-model="searchForm.warehouse_id"
            clearable
            placeholder="选择仓库"
            class="w-200"
          >
            <el-option
              v-for="item in warehouses"
              :key="item.warehouse_id"
              :label="item.warehouse_name"
              :value="item.warehouse_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" class="form-item-small">
          <el-select
            v-model="searchForm.status"
            clearable
            placeholder="选择状态"
            class="w-150"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词" class="form-item-medium">
          <el-input
            v-model="searchForm.keyword"
            placeholder="货区代码/名称"
            clearable
            class="w-200"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮和表格 -->
    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span class="title">货区列表</span>
          <div class="header-buttons">
            <el-button type="primary" @click="showImportDialog">导入</el-button>
            <el-button type="success" @click="handleExport">导出</el-button>
            <el-button type="primary" @click="showAddDialog">新增</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="zones"
        v-loading="loading"
        style="width: 100%"
        border
      >
        <el-table-column prop="zone_code" label="货区代码" min-width="120" />
        <el-table-column prop="zone_name" label="货区名称" min-width="150" />
        <el-table-column prop="warehouse_name" label="所属仓库" min-width="150" />
        <el-table-column prop="floor_level" label="楼层" width="80" align="center" />
        <el-table-column prop="capacity" label="容量(m³)" width="100" align="right" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            {{ getZoneTypeText(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                :type="row.status === 'active' ? 'danger' : 'success'"
                size="small"
                @click="handleStatusChange(row)"
              >
                {{ row.status === 'active' ? '禁用' : '启用' }}
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="showEditDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 表单对话框 -->
    <el-dialog
      :title="isEdit ? '编辑货区' : '新增货区'"
      v-model="dialogVisible"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="dialog-form"
      >
        <el-form-item label="所属仓库" prop="warehouse_id">
          <el-select
            v-model="form.warehouse_id"
            placeholder="选择仓库"
            class="w-full"
          >
            <el-option
              v-for="item in warehouses"
              :key="item.warehouse_id"
              :label="item.warehouse_name"
              :value="item.warehouse_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="货区代码" prop="zone_code">
          <el-input
            v-model="form.zone_code"
            placeholder="请输入货区代码"
            :disabled="isEdit"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="货区名称" prop="zone_name">
          <el-input
            v-model="form.zone_name"
            placeholder="请输入货区名称"
            class="w-full"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="楼层" prop="floor_level">
              <el-input-number
                v-model="form.floor_level"
                :min="1"
                class="w-full"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="容量" prop="capacity">
              <el-input-number
                v-model="form.capacity"
                :min="0"
                class="w-full"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-select v-model="form.type" class="w-full">
                <el-option label="存储区" value="storage" />
                <el-option label="拣货区" value="picking" />
                <el-option label="包装区" value="packing" />
                <el-option label="收货区" value="receiving" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" class="w-full">
                <el-option label="启用" value="active" />
                <el-option label="禁用" value="inactive" />
                <el-option label="维护中" value="maintenance" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入货区数据"
      width="500px"
      @close="handleImportDialogClose"
    >
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        :auto-upload="false"
        :show-file-list="true"
        :limit="1"
        :on-exceed="handleExceed"
        :before-upload="handleBeforeUpload"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        accept=".xlsx,.xls"
      >
        <template #trigger>
          <el-button type="primary">选择文件</el-button>
        </template>
        <template #tip>
          <div class="el-upload__tip">
            只能上传 Excel 文件，且不超过 2MB
            <el-link
              type="primary"
              :underline="false"
              class="ml-2"
              @click="downloadTemplate"
            >
              下载模板
            </el-link>
          </div>
        </template>
      </el-upload>

      <!-- 错误提示区域 -->
      <div v-if="importError" class="import-error-box">
        <el-alert
          type="error"
          :closable="false"
          show-icon
        >
          <template #title>
            导入失败，发现以下问题
          </template>
          <template #default>
            <div class="error-content">
              <p>{{ getErrorSummary(importErrors) }}</p>
              <el-button
                type="primary"
                link
                class="download-btn"
                @click="downloadErrorReport"
              >
                下载详细错误报告
              </el-button>
            </div>
          </template>
        </el-alert>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleImportCancel">取消</el-button>
          <el-button
            type="primary"
            :disabled="!selectedFile"
            :loading="importLoading"
            @click="handleImportConfirm"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'WarehouseZoneView'
});
import { ref, onMounted, onBeforeUnmount, h, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { warehouseZoneApi, type WarehouseZone } from '@/api/warehouseZone';
import { warehouseApi } from '@/api/warehouse';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { useRoute } from 'vue-router';
import { useViewStore } from '@/stores/view';
import type { TableRecord } from '@/stores/view';
import type { UploadRequestOptions } from 'element-plus';
import { UploadInstance } from 'element-plus';

// 定义货区数据类型
interface ZoneRecord extends TableRecord {
  zone_code: string;
  zone_name: string;
  warehouse_id: number;
  warehouse_name: string;
  floor_level: number;
  capacity: number;
  type: string;
  status: string;
}

const route = useRoute();
const viewStore = useViewStore();
const viewName = 'warehouse-zones';

// 状态定义
const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const importDialogVisible = ref(false);
const isEdit = ref(false);
const zones = ref([]);
const warehouses = ref([]);
const formRef = ref<FormInstance>();
const authStore = useAuthStore();

// 搜索表单
const searchForm = ref({
  warehouse_id: '',
  status: '',
  keyword: ''
});

// 表单数据
const form = ref({
  warehouse_id: undefined,
  zone_code: '',
  zone_name: '',
  floor_level: 1,
  capacity: 0,
  type: 'storage',
  status: 'active'
});

// 表单验证规则
const rules = {
  warehouse_id: [
    { required: true, message: '请选择仓库', trigger: 'change' }
  ],
  zone_code: [
    { required: true, message: '请输入货区代码', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  zone_name: [
    { required: true, message: '请输入货区名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ]
};

// 获取仓库列表
const fetchWarehouses = async () => {
  try {
    const response = await warehouseApi.getWarehouses();
    warehouses.value = response.data.data;
  } catch (error) {
    console.error('获取仓库列表失败:', error);
  }
};

// 获取货区列表
const fetchZones = async () => {
  try {
    loading.value = true;
    const response = await warehouseZoneApi.getZones(searchForm.value);
    zones.value = response.data.data;
  } catch (error) {
    console.error('获取货区列表失败:', error);
    ElMessage.error('获取货区列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取数据
const fetchData = async () => {
  loading.value = true;
  try {
    await fetchWarehouses();
    const data = await fetchZones(searchForm.value);

    // 更新视图状态
    viewStore.updateTableData<ZoneRecord>(viewName, data);
    viewStore.updateSearchForm(viewName, searchForm.value);
  } finally {
    loading.value = false;
  }
};

// 搜索处理
const handleSearch = () => {
  viewStore.updateSearchForm(viewName, searchForm.value);
  fetchData();
};

// 重置搜索
const resetSearch = () => {
  searchForm.value = {
    warehouse_id: '',
    status: '',
    keyword: ''
  };
  viewStore.updateSearchForm(viewName, searchForm.value);
  fetchData();
};

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false;
  form.value = {
    warehouse_id: undefined,
    zone_code: '',
    zone_name: '',
    floor_level: 1,
    capacity: 0,
    type: 'storage',
    status: 'active'
  };
  dialogVisible.value = true;
};

// 显示编辑对话框
const showEditDialog = (row: any) => {
  isEdit.value = true;
  form.value = { ...row };
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isEdit.value) {
      await warehouseZoneApi.updateZone(form.value.zone_id, form.value);
      ElMessage.success('更新成功');
    } else {
      await warehouseZoneApi.createZone(form.value);
      ElMessage.success('添加成功');
    }

    dialogVisible.value = false;
    await fetchZones();
  } catch (error: any) {
    console.error('提交失败:', error);
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    submitLoading.value = false;
  }
};

// 处理状态变更
const handleStatusChange = async (row: WarehouseZone) => {
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    const confirmText = newStatus === 'active' ? '启用' : '禁用';

    await ElMessageBox.confirm(
      `确定要${confirmText}该货区吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await warehouseZoneApi.updateStatus(row.zone_id, newStatus);
    ElMessage.success(`${confirmText}成功`);
    await fetchZones();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || `${confirmText}失败`);
      console.error('状态更新失败:', error);
    }
  }
};

// 删除处理
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该货区吗？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await warehouseZoneApi.deleteZone(row.zone_id);
    ElMessage.success('删除成功');
    await fetchZones();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
      console.error('删除失败:', error);
    }
  }
};

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'success',
    inactive: 'danger',
    maintenance: 'warning'
  };
  return types[status] || 'info';
};

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '启用',
    inactive: '禁用',
    maintenance: '维护中'
  };
  return texts[status] || status;
};

// 获取货区类型文本
const getZoneTypeText = (type: string) => {
  const texts: Record<string, string> = {
    storage: '存储区',
    picking: '拣货区',
    packing: '包装区',
    receiving: '收货区'
  };
  return texts[type] || type;
};

// 处理导出
const handleExport = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要导出货区数据吗？',
      '导出确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    );

    // 准备导出数据
    const exportData = zones.value.map(zone => ({
      '货区代码': zone.zone_code,
      '货区名称': zone.zone_name,
      '所属仓库': zone.warehouse_name,
      '楼层': zone.floor_level,
      '容量(m³)': zone.capacity,
      '类型': getZoneTypeText(zone.type),
      '状态': getStatusText(zone.status)
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    const colWidths = [
      { wch: 15 }, // 货区代码
      { wch: 20 }, // 货区名称
      { wch: 20 }, // 所属仓库
      { wch: 8 },  // 楼层
      { wch: 12 }, // 容量
      { wch: 10 }, // 类型
      { wch: 10 }  // 状态
    ];
    ws['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '货区列表');

    // 生成文件并下载
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // 生成文件名：货区列表_年月日时分秒.xlsx
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    saveAs(blob, `货区列表_${timestamp}.xlsx`);

    ElMessage.success('导出成功');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导出失败:', error);
      ElMessage.error('导出失败');
    }
  }
};

// 显示导入对话框
const showImportDialog = () => {
  importDialogVisible.value = true;
};

// 下载模板
const downloadTemplate = async () => {
  try {
    const response = await warehouseZoneApi.downloadTemplate();

    // 检查响应类型
    if (response.data.type === 'application/json') {
      // 如果返回的是 JSON，说明可能有错误信息
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = JSON.parse(reader.result as string);
          ElMessage.error(result.message || '下载模板失败');
        } catch (e) {
          ElMessage.error('下载模板失败');
        }
      };
      reader.readAsText(response.data);
      return;
    }

    // 正常下载处理
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '货区导入模板.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('下载模板失败:', error);
    if (error.response?.status === 404) {
      ElMessage.error('下载模板接口不存在，请联系管理员');
    } else {
      ElMessage.error(error.response?.data?.message || '下载模板失败，请重试');
    }
  }
};

// 导入相关状态
const uploadRef = ref<UploadInstance>();
const selectedFile = ref<File | null>(null);
const importLoading = ref(false);
const importError = ref(false);
const importErrors = ref<string[]>([]);
const errorReportInfo = ref<{ url: string; filename: string } | null>(null);

// 文件选择前验证
const handleBeforeUpload = (file: File) => {
  const isExcel = /\.(xlsx|xls)$/.test(file.name.toLowerCase());
  if (!isExcel) {
    ElMessage.error('只能上传 Excel 文件！');
    return false;
  }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    ElMessage.error('文件大小不能超过 2MB！');
    return false;
  }
  return true;
};

// 文件选择变化处理
const handleFileChange = (uploadFile: any) => {
  if (uploadFile.raw) {
    selectedFile.value = uploadFile.raw;
  }
};

// 文件移除处理
const handleFileRemove = () => {
  selectedFile.value = null;
};

// 取消导入
const handleImportCancel = () => {
  importDialogVisible.value = false;
};

// 获取错误摘要
const getErrorSummary = (errors: string[]) => {
  if (!errors.length) return '';

  // 统计错误类型
  const errorTypes = new Set(
    errors.map(error => {
      const match = error.match(/第 \d+ 行: (.*?)"/);
      return match ? match[1] : error;
    })
  );

  if (errorTypes.size === 1) {
    return `存在${errors.length}条记录${Array.from(errorTypes)[0]}，请修正后重试`;
  } else {
    return `存在${errors.length}条记录有问题，请下载错误报告查看详情`;
  }
};

// 下载错误报告
const downloadErrorReport = async () => {
  if (!errorReportInfo.value) {
    ElMessage.error('无法获取错误报告信息');
    return;
  }

  try {
    console.log('Downloading error report from:', errorReportInfo.value.url); // 添加日志
    const response = await warehouseZoneApi.downloadErrorReport(errorReportInfo.value.url);

    // 检查响应状态
    if (response.status === 404) {
      ElMessage.error('错误报告文件已过期，请重新导入');
      return;
    }

    // 检查响应数据
    if (!(response.data instanceof Blob)) {
      ElMessage.error('下载错误报告失败，请重试');
      return;
    }

    // 创建 blob 对象
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // 使用 file-saver 下载文件
    saveAs(blob, errorReportInfo.value.filename);

  } catch (error) {
    console.error('下载错误报告失败:', error);
    ElMessage.error('下载错误报告失败，请重试');
  }
};

// 确认导入
const handleImportConfirm = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要导入的文件');
    return;
  }

  importLoading.value = true;
  importError.value = false;
  importErrors.value = [];
  errorReportInfo.value = null;

  try {
    const res = await warehouseZoneApi.importData(selectedFile.value);

    if (res.data.success) {
      ElMessage.success(res.data.message);
      importDialogVisible.value = false;
      fetchData();
    } else {
      // 处理导入失败的情况
      importError.value = true;
      importErrors.value = res.data.errors || [];
      if (res.data.errorReport) {
        console.log('Error report info:', res.data.errorReport); // 添加日志
        errorReportInfo.value = {
          url: res.data.errorReport.url,
          filename: res.data.errorReport.filename
        };
      }
      ElMessage({
        type: 'error',
        message: '导入失败，请查看错误报告',
        duration: 5000
      });
    }
  } catch (error: any) {
    console.error('Upload failed:', error);
    ElMessage.error('导入失败，请重试');
  } finally {
    importLoading.value = false;
  }
};

// 导入对话框关闭前的处理
const handleImportDialogClose = () => {
  selectedFile.value = null;
  importLoading.value = false;
  importError.value = false;
  importErrors.value = [];
  errorReportInfo.value = null;
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

// 处理文件超出限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件');
};

// 组件挂载时恢复状态
onMounted(async () => {
  // 检查权限
  if (!authStore.hasRole(['admin'])) {
    ElMessage.error('无权限访问');
    router.push('/dashboard');
    return;
  }

  // 恢复状态
  const state = viewStore.getViewState<ZoneRecord>(viewName);
  if (state?.searchForm) {
    searchForm.value = { ...state.searchForm };
  }

  await fetchData();
});

// 组件销毁前保存状态
onBeforeUnmount(() => {
  viewStore.updateScrollPosition(viewName, window.scrollY);
});
</script>

<style scoped>
.zone-view {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.form-item-small {
  min-width: 180px;
}

.form-item-medium {
  min-width: 250px;
}

.content-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.dialog-form {
  padding: 20px;
}

:deep(.el-form-item__content) {
  justify-content: flex-start;
}

.w-full {
  width: 100%;
}

.w-150 {
  width: 150px;
}

.w-200 {
  width: 200px;
}

/* 表格内按钮组样式 */
:deep(.el-button-group) {
  display: flex;
  gap: 5px;
}

:deep(.el-button-group .el-button) {
  margin-left: 0;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.import-container {
  padding: 20px;
}

.template-download {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.el-upload__tip {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
  margin-top: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.import-error-box {
  margin-top: 20px;
}

.error-content {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.download-btn {
  align-self: flex-start;
}
</style>
