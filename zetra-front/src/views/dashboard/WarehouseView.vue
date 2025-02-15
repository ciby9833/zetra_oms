<template>
  <div class="warehouse-view">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态" class="form-item-small">
          <el-select
            v-model="searchForm.status"
            clearable
            placeholder="选择状态"
            class="w-150"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词" class="form-item-medium">
          <el-input
            v-model="searchForm.keyword"
            placeholder="仓库代码/名称"
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
          <span class="title">仓库列表</span>
          <el-button type="primary" @click="showAddDialog">新增仓库</el-button>
        </div>
      </template>

      <el-table
        :data="warehouses"
        v-loading="loading"
        style="width: 100%"
        border
      >
        <el-table-column prop="warehouse_code" label="仓库代码" min-width="120" />
        <el-table-column prop="warehouse_name" label="仓库名称" min-width="150" />
        <el-table-column prop="location" label="详细地址" min-width="200" />
        <el-table-column prop="capacity" label="容量(m³)" width="100" align="right" />
        <el-table-column prop="manager_name" label="负责人" width="120" align="center" />
        <el-table-column prop="contact_phone" label="联系电话" width="120" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
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
      :title="isEdit ? '编辑仓库' : '新增仓库'"
      v-model="dialogVisible"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="仓库代码" prop="warehouse_code">
          <el-input v-model="form.warehouse_code" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="仓库名称" prop="warehouse_name">
          <el-input v-model="form.warehouse_name" />
        </el-form-item>
        <el-form-item label="所在地区" required>
          <el-cascader
            v-model="form.region"
            :options="regionOptions"
            :props="cascaderProps"
            placeholder="请选择所在地区"
            :style="{ width: '320px' }"
            @change="handleRegionChange"
            filterable
            clearable
          />
        </el-form-item>

        <el-form-item label="详细地址" prop="location">
          <el-input v-model="form.location" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="form.capacity" :min="0" />
        </el-form-item>
        <el-form-item label="负责人" prop="manager_name">
          <el-input v-model="form.manager_name" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contact_phone">
          <el-input v-model="form.contact_phone" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'WarehouseView'
});
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { warehouseApi, type Warehouse } from '@/api/warehouse';
import { administrativeDivisionApi } from '@/api/administrativeDivision';
import { useFormStore } from '@/stores/form';
import { useRoute, useRouter } from 'vue-router';
import { useViewStore } from '@/stores/view';
import type { TableRecord } from '@/stores/view';
import { useAuthStore } from '@/stores/auth';



const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const warehouses = ref<Warehouse[]>([]);
const formRef = ref<FormInstance>();
const route = useRoute();
const router = useRouter();
const formStore = useFormStore();
const viewStore = useViewStore();
const authStore = useAuthStore();
const viewName = 'warehouse';

// 定义仓库数据类型
interface WarehouseRecord extends TableRecord {
  warehouse_id: number;
  warehouse_code: string;
  warehouse_name: string;
  location: string;
  capacity: number;
  manager_name: string;
  contact_phone: string;
  status: string;
}

const form = ref({
  warehouse_code: '',
  warehouse_name: '',
  location: '',
  capacity: 0,
  manager_id: null as number | null,
  contact_phone: '',
  status: 'active' as const,
  country: 'Indonesia',
  province: '',
  city: '',
  district: '',
  township: '',
  country_id: 'ID',
  province_id: null as string | null,
  city_id: null as string | null,
  district_id: null as string | null,
  township_id: null as string | null,
  region: [] as string[],
  manager_name: ''
});

const rules = {
  warehouse_code: [
    { required: true, message: '请输入仓库代码', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  warehouse_name: [
    { required: true, message: '请输入仓库名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入详细地址', trigger: 'blur' }
  ],
  capacity: [
    { required: true, message: '请输入仓库容量', trigger: 'blur' },
    { type: 'number', min: 0, message: '容量必须大于等于0', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择仓库状态', trigger: 'change' }
  ],
  manager_name: [
    { required: true, message: '请输入负责人姓名', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  country: [
    { max: 100, message: '长度不能超过100个字符', trigger: 'blur' }
  ],
  province: [
    { required: true, message: '请选择省份', trigger: 'change' }
  ],
  city: [
    { required: true, message: '请选择城市', trigger: 'change' }
  ],
  district: [
    { required: true, message: '请选择区县', trigger: 'change' }
  ],
  township: [
    { required: true, message: '请选择乡镇', trigger: 'change' }
  ]
};

// 搜索表单
const searchForm = ref({
  status: '',
  keyword: ''
});

// 获取数据
const fetchData = async () => {
  loading.value = true;
  try {
    const response = await warehouseApi.getWarehouses(searchForm.value);
    const data = response.data.data;

    // 更新视图状态
    viewStore.updateTableData<WarehouseRecord>(viewName, data);
    viewStore.updateSearchForm(viewName, searchForm.value);

    warehouses.value = data;
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    ElMessage.error('获取仓库列表失败');
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
    status: '',
    keyword: ''
  };
  viewStore.updateSearchForm(viewName, searchForm.value);
  fetchData();
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
  const state = viewStore.getViewState<WarehouseRecord>(viewName);
  if (state?.searchForm) {
    searchForm.value = { ...state.searchForm };
  }

  await fetchData();
});

// 组件销毁前保存状态
onBeforeUnmount(() => {
  viewStore.updateScrollPosition(viewName, window.scrollY);
});

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false;
  form.value = {
    warehouse_code: '',
    warehouse_name: '',
    location: '',
    capacity: 0,
    manager_id: null,
    contact_phone: '',
    status: 'active',
    country: 'Indonesia',
    province: '',
    city: '',
    district: '',
    township: '',
    country_id: 'ID',
    province_id: null,
    city_id: null,
    district_id: null,
    township_id: null,
    region: [],
    manager_name: ''
  };
  dialogVisible.value = true;
};

// 显示编辑对话框
const showEditDialog = (row: Warehouse) => {
  isEdit.value = true;
  form.value = {
    ...row,
    status: row.status || 'active',
    country_id: row.country_id ? parseInt(row.country_id.toString()) : null,
    province_id: row.province_id ? parseInt(row.province_id.toString()) : null,
    city_id: row.city_id ? parseInt(row.city_id.toString()) : null,
    district_id: row.district_id ? parseInt(row.district_id.toString()) : null,
    township_id: row.township_id ? parseInt(row.township_id.toString()) : null,
    region: [
      row.province_id?.toString(),
      row.city_id?.toString(),
      row.district_id?.toString(),
      row.township_id?.toString()
    ].filter(Boolean)
  };
  dialogVisible.value = true;
};

// 监听表单变化
watch(form, () => {
  formStore.setFormDirty(route.path, true);
}, { deep: true });

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    // 检查是否选择了地区
    if (!form.value.province || !form.value.province_id) {
      ElMessage.warning('请选择省份');
      return;
    }

    if (!form.value.city || !form.value.city_id) {
      ElMessage.warning('请选择城市');
      return;
    }

    if (!form.value.district || !form.value.district_id) {
      ElMessage.warning('请选择区县');
      return;
    }

    // 构建提交数据
    const submitData = {
      warehouse_code: form.value.warehouse_code,
      warehouse_name: form.value.warehouse_name,
      location: form.value.location,
      capacity: form.value.capacity,
      manager_id: form.value.manager_id,
      contact_phone: form.value.contact_phone || null,
      status: form.value.status,
      // 地区字段
      province: form.value.province,
      city: form.value.city,
      district: form.value.district,
      township: form.value.township || null,
      // 地区ID字段
      province_id: form.value.province_id,
      city_id: form.value.city_id,
      district_id: form.value.district_id,
      township_id: form.value.township_id || null
    };

    console.log('提交的数据:', submitData);

    if (isEdit.value) {
      await warehouseApi.updateWarehouse(form.value.warehouse_id!, submitData);
      ElMessage.success('更新成功');
    } else {
      await warehouseApi.createWarehouse(submitData);
      ElMessage.success('添加成功');
    }

    dialogVisible.value = false;
    fetchData();
    formStore.clearFormState(route.path);
  } catch (error: any) {
    console.error('提交失败:', error);
    ElMessage.error(error.response?.data?.message || (isEdit.value ? '更新失败' : '添加失败'));
  } finally {
    submitLoading.value = false;
  }
};

// 删除仓库
const handleDelete = async (row: Warehouse) => {
  try {
    await ElMessageBox.confirm('确定要删除该仓库吗？', '提示', {
      type: 'warning'
    });

    await warehouseApi.deleteWarehouse(row.warehouse_id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

// 状态选项定义
const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
];

// 地区选择器配置
const regionOptions = ref([]);

// 级联选择器配置
const cascaderProps = {
  value: 'code',        // 使用 code 作为值
  label: 'name',        // 使用 name 作为标签
  children: 'children', // 子节点字段名
  checkStrictly: false,
  lazy: true,
  lazyLoad: async (node: any, resolve: (nodes: any[]) => void) => {
    const options: any[] = [];
    try {
      let response;
      const pathValues = node.path?.map((n: any) => n.value) || [];

      if (node.level === 0) {
        // 加载省份
        response = await administrativeDivisionApi.getProvinces();
        if (response.data.success) {
          const provinces = response.data.data.map((province: any) => ({
            value: province.province_code,
            label: province.province_name,
            leaf: false
          }));
          resolve(provinces);
          return;
        }
      }

      // 根据层级加载对应数据
      switch (node.level) {
        case 1: // 加载城市
          response = await administrativeDivisionApi.getCities(pathValues[0]);
          if (response.data.success) {
            const cities = response.data.data.map((city: any) => ({
              value: city.city_code,
              label: city.city_name,
              leaf: false
            }));
            resolve(cities);
          }
          break;

        case 2: // 加载区县
          response = await administrativeDivisionApi.getDistricts(pathValues[0], pathValues[1]);
          if (response.data.success) {
            const districts = response.data.data.map((district: any) => ({
              value: district.district_code,
              label: district.district_name,
              leaf: false
            }));
            resolve(districts);
          }
          break;

        case 3: // 加载乡镇
          response = await administrativeDivisionApi.getTownships(
            pathValues[0],
            pathValues[1],
            pathValues[2]
          );
          if (response.data.success) {
            const townships = response.data.data.map((township: any) => ({
              value: township.township_code,
              label: township.township_name,
              leaf: true
            }));
            resolve(townships);
          }
          break;

        default:
          resolve([]);
      }
    } catch (error) {
      console.error('加载地区数据失败:', error);
      resolve([]);
    }
  }
};

// 地区选择处理
const handleRegionChange = (values: string[]) => {
  if (!values || values.length === 0) {
    form.value.province = '';
    form.value.city = '';
    form.value.district = '';
    form.value.township = '';
    form.value.province_id = null;
    form.value.city_id = null;
    form.value.district_id = null;
    form.value.township_id = null;
    return;
  }

  // 更新表单中的地区信息
  const selectedNodes = values.map((value, index) => ({
    value,
    level: index + 1
  }));

  selectedNodes.forEach((node) => {
    switch (node.level) {
      case 1:
        form.value.province_id = node.value;
        break;
      case 2:
        form.value.city_id = node.value;
        break;
      case 3:
        form.value.district_id = node.value;
        break;
      case 4:
        form.value.township_id = node.value;
        break;
    }
  });
};

// 处理状态变更
const handleStatusChange = async (row: Warehouse) => {
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    const confirmText = newStatus === 'active' ? '启用' : '禁用';

    await ElMessageBox.confirm(
      `确定要${confirmText}该仓库吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await warehouseApi.updateWarehouseStatus(row.warehouse_id, newStatus);
    ElMessage.success(`${confirmText}成功`);
    await fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败');
      console.error('状态更新失败:', error);
    }
  }
};
</script>

<style scoped>
.warehouse-view {
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
</style>


