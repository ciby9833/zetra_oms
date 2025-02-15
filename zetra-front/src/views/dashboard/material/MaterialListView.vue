<template>
  <div class="material-list">
    <el-card>
      <!-- 搜索区域 -->
      <div class="search-area">
        <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="物料编码/名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-cascader
              v-model="searchForm.category_id"
              :options="categoryOptions"
              :props="{
                checkStrictly: true,
                label: 'category_name',
                value: 'category_id',
                emitPath: false
              }"
              clearable
              placeholder="选择分类"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="searchForm.status"
              placeholder="选择状态"
              clearable
            >
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>查询
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button
          type="primary"
          @click="handleAdd"
        >
          <el-icon><Plus /></el-icon>新增物料
        </el-button>
        <el-button-group>
          <el-button type="success" @click="handleImport">
            <el-icon><Upload /></el-icon>导入
          </el-button>
          <el-button type="warning" @click="handleExportClick">
            <el-icon><Download /></el-icon>导出
          </el-button>
        </el-button-group>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="materialList"
        border
        style="width: 100%"
      >
        <el-table-column prop="material_code" label="物料编码" width="120" />
        <el-table-column prop="material_name" label="物料名称" min-width="150" />
        <el-table-column prop="category_name" label="物料分类" width="120" />
        <el-table-column label="基本单位" width="100">
          <template #default="{ row }">
            {{ row.unit_name }}
          </template>
        </el-table-column>
        <el-table-column prop="specifications" label="规格" width="150" />
        <el-table-column label="批次管理" width="100">
          <template #default="{ row }">
            <el-tag :type="row.batch_control ? 'success' : 'info'">
              {{ row.batch_control ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="序列号管理" width="100">
          <template #default="{ row }">
            <el-tag :type="row.serial_control ? 'success' : 'info'">
              {{ row.serial_control ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="creator_name"
          label="创建用户"
          min-width="100"
          show-overflow-tooltip
        />
        <el-table-column
          prop="owner_name"
          label="所属用户"
          min-width="100"
          show-overflow-tooltip
        />
        <el-table-column
          prop="created_at"
          label="创建时间"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="updated_at"
          label="更新时间"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                link
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                type="primary"
                link
                @click="handleView(row)"
              >
                查看
              </el-button>
              <el-button
                type="danger"
                link
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <material-form-dialog
      v-model="dialogVisible"
      :type="dialogType"
      :material-id="currentMaterialId"
      @success="handleSuccess"
    />

    <!-- 导入对话框 -->
    <material-import-dialog
      v-model="importDialogVisible"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'MaterialListView' })
import { onMounted, onActivated } from 'vue';
import { ref, reactive, computed, watch } from 'vue';
import { Search, Plus, Upload, Download, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { useMaterialStore } from '@/stores/material';
import { useMaterialCategoryStore } from '@/stores/material/categoryStore';
import { useMaterialUnitStore } from '@/stores/material/unitStore';
import { useMaterialConversionStore } from '@/stores/material/conversionStore';
import MaterialFormDialog from '@/components/material/dialog/MaterialFormDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { uploadUtil } from '@/utils/upload';
import type { Material, Category } from '@/types/material';
import * as materialApi from '@/api/material';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import MaterialImportDialog from '@/components/material/dialog/MaterialImportDialog.vue'
import { useTabsStore } from '@/stores/tabs'

const tabsStore = useTabsStore()

// 类型定义
interface SearchForm {
  keyword: string;
  category_id: number | null;
  status: string;
}

// 状态定义
const materialStore = useMaterialStore();
const categoryStore = useMaterialCategoryStore();
const unitStore = useMaterialUnitStore();
const conversionStore = useMaterialConversionStore();
const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref<'add' | 'edit' | 'view'>('edit');
const currentMaterialId = ref<number | null>(null);
const materialList = ref<Material[]>([]);
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
});

// 查询表单
const searchForm = ref({
  keyword: '',
  category_id: null,
  status: ''
});

// 导入相关
const importDialogVisible = ref(false)

// 方法定义
const loadData = async () => {
  try {
    loading.value = true;

    // 构建查询参数
    const params = {
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      ...searchForm.value,
      // 只传递有值的参数
      keyword: searchForm.value.keyword || undefined,
      category_id: searchForm.value.category_id || undefined,
      status: searchForm.value.status || undefined
    };

    const result = await materialStore.fetchMaterials(params);
    materialList.value = result.list;
    pagination.value.total = result.total;
  } catch (error) {
    console.error('加载物料列表失败:', error);
    ElMessage.error('加载物料列表失败');
  } finally {
    loading.value = false;
  }
};

// 处理搜索
const handleSearch = () => {
  pagination.value.currentPage = 1; // 重置到第一页
  loadData();
};

// 处理重置
const handleReset = () => {
  searchForm.value = {
    keyword: '',
    category_id: null,
    status: ''
  };
  handleSearch();
};

// 处理分页变化
const handlePageChange = (page: number) => {
  pagination.value.currentPage = page;
  loadData();
};

// 处理每页条数变化
const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size;
  pagination.value.currentPage = 1;
  loadData();
};

// CRUD 操作
const handleAdd = () => {
  router.push({
    name: 'material-form',
    query: { type: 'add' }
  }).catch(err => {
    console.error('路由跳转失败:', err);
    ElMessage.error('页面跳转失败');
  });
};

const handleEdit = (row: Material) => {
  currentMaterialId.value = row.material_id;
  dialogType.value = 'edit';
  dialogVisible.value = true;
};

const handleView = (row: Material) => {
  currentMaterialId.value = row.material_id;
  dialogType.value = 'view';
  dialogVisible.value = true;
};

const handleDelete = (row: Material) => {
  ElMessageBox.confirm('确定要删除该物料吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await materialStore.deleteMaterial(row.material_id);
      ElMessage.success('删除成功');
      loadData();
    } catch (error: Error) {
      ElMessage.error(error.message || '删除失败');
    }
  });
};

const handleSuccess = () => {
  dialogVisible.value = false;
  currentMaterialId.value = null;
  loadData();
};

// 生命周期
onMounted(async () => {
  try {
    await loadBaseData();
    await loadData();
    categoryStore.fetchCategoryTree();
  } catch (error) {
    console.error('初始化失败:', error);
    ElMessage.error('加载数据失败');
  }
});

// 导入处理
const handleImport = () => {
  importDialogVisible.value = true
}

// 导入成功处理
const handleImportSuccess = () => {
  importDialogVisible.value = false
  loadData()
  ElMessage.success('导入成功')
}

// 导出处理
const handleExport = async (type: 'all' | 'selected' = 'all') => {
  try {
    loading.value = true;

    // 构建导出参数
    const exportParams = {
      keyword: searchForm.value.keyword,
      category_id: searchForm.value.category_id,
      status: searchForm.value.status,
      exportType: type,
      // 如果是选中导出，添加选中的ID列表
      ...(type === 'selected' ? {
        ids: selectedRows.value.map(row => row.material_id)
      } : {})
    };

    await materialStore.exportMaterials(exportParams);
    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error(error instanceof Error ? error.message : '导出失败');
  } finally {
    loading.value = false;
  }
};

// 导出按钮点击事件
const handleExportClick = () => {
  if (selectedRows.value.length > 0) {
    ElMessageBox.confirm(
      '是否只导出选中的记录？',
      '导出确认',
      {
        confirmButtonText: '导出选中',
        cancelButtonText: '导出全部',
        type: 'info'
      }
    )
      .then(() => {
        handleExport('selected');
      })
      .catch(() => {
        handleExport('all');
      });
  } else {
    handleExport('all');
  }
};

// 加载基础数据
const loadBaseData = async () => {
  try {
    await materialStore.initialize();
  } catch (error) {
    console.error('加载基础数据失败:', error);
    ElMessage.error('加载基础数据失败，请刷新页面重试');
  }
};

// 计算单位选项
const unitOptions = computed(() => {
  return unitStore.allUnits.map(unit => ({
    label: `${unit.unit_name} (${unit.unit_code})`,
    value: unit.unit_id
  }));
});

// 格式化日期时间
const formatDateTime = (datetime: string) => {
  if (!datetime) return '-';
  return dayjs(datetime).format('YYYY-MM-DD HH:mm:ss');
};

// 将分类数据定义为计算属性
const categoryOptions = computed(() => {
  return categoryStore.categories;
});

// 当组件从 keep-alive 缓存中恢复时（onActivated 钩子）
// 如果希望每次激活时都刷新，可以取消注释下面的 loadData 调用
onActivated(() => {
  // 如果需要自动刷新数据，取消注释以下语句：
  // loadData();
});
</script>

<style lang="scss" scoped>
.material-list {
  .search-area {
    margin-bottom: 16px;

    :deep(.el-form-item) {
      margin-bottom: 16px;
    }

    :deep(.el-select),
    :deep(.el-cascader) {
      width: 200px;
    }
  }
  .toolbar {
    margin-bottom: 16px;
  }
  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
