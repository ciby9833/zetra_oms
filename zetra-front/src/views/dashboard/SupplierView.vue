<template>
  <div class="supplier-view">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="供应商编码">
          <el-input
            v-model="searchForm.supplier_code"
            placeholder="供应商编码"
            clearable
            @keyup.enter="fetchData"
          />
        </el-form-item>
        <el-form-item label="供应商名称">
          <el-input
            v-model="searchForm.supplier_name"
            placeholder="供应商名称"
            clearable
            @keyup.enter="fetchData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮和表格 -->
    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span class="title">供应商列表</span>
          <div class="header-buttons">
            <!-- 新增导入与导出按钮 -->
            <!-- <el-button type="primary" @click="triggerImport">导入</el-button> -->
            <el-button type="success" @click="handleExport">导出</el-button>
            <el-button type="primary" @click="showAddDialog">新增供应商</el-button>
          </div>
        </div>
      </template>
      <el-table :data="suppliers" v-loading="loading" border style="width: 100%">
        <el-table-column prop="supplier_code" label="供应商编码" min-width="120" />
        <el-table-column prop="supplier_name" label="供应商名称" min-width="150" />
        <el-table-column prop="contact_person" label="联系人" min-width="100" />
        <el-table-column prop="contact_phone" label="联系电话" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="150" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" size="small" @click="showEditDialog(row)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页组件 -->
      <el-pagination
        background
        layout="prev, pager, next, jumper, ->, total"
        :current-page="pagination.currentPage"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- 新增/编辑供应商对话框 -->
    <el-dialog :title="isEdit ? '编辑供应商' : '新增供应商'" v-model="dialogVisible" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="dialog-form">
        <el-form-item label="供应商编码">
          <!-- 供应商编码自动生成，用户不可修改，但允许表单验证 -->
          <el-input v-model="form.supplier_code" readonly></el-input>
        </el-form-item>
        <el-form-item label="供应商名称" prop="supplier_name">
          <el-input v-model="form.supplier_name" placeholder="请输入供应商名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact_person">
          <el-input v-model="form.contact_person" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contact_phone">
          <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="税号" prop="tax_number">
          <el-input v-model="form.tax_number" placeholder="请输入税号" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input type="textarea" v-model="form.description" placeholder="请输入描述信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 隐藏文件输入，用于上传导入文件 -->
    <input type="file" ref="fileInput" style="display: none" @change="handleFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onActivated } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { supplierApi, type Supplier } from '@/api/supplier';
import { useAuthStore } from '@/stores/auth';

const loading = ref(false);
const suppliers = ref<Supplier[]>([]);
const searchForm = reactive({
  supplier_code: '',
  supplier_name: ''
});

const dialogVisible = ref(false);
const isEdit = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance>();
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
});
const fileInput = ref<HTMLInputElement | null>(null);

const authStore = useAuthStore();

// 定义查询状态标识，初始为 false，表示还未点击查询
const hasSearched = ref(false);

// 新增方法：自动生成供应商编码，规则 SUP+YYYYMMDD+XXXX
const generateSupplierCode = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const randomNum = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `SUP${year}${month}${day}${randomNum}`;
};

const form = reactive({
  supplier_id: 0, // 用于编辑时保存 id
  supplier_code: '', // 自动生成的新供应商编码
  supplier_name: '',
  description: '',
  contact_person: '',
  contact_phone: '',
  email: '',
  address: '',
  tax_number: '',
  status: 'active',
  created_by: authStore.user?.userId,
  owner_id: authStore.user?.userId
});

const rules = {
  supplier_code: [{ required: true, message: '请输入供应商编码', trigger: 'blur' }],
  supplier_name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }]
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      supplier_code: searchForm.supplier_code,
      supplier_name: searchForm.supplier_name,
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize
    };
    const res = await supplierApi.getSuppliers(params);
    if (res.data.success) {
      suppliers.value = res.data.data;
      if (res.data.total !== undefined) {
        pagination.value.total = res.data.total;
      }
      hasSearched.value = true;
    } else {
      ElMessage.error(res.data.message);
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  searchForm.supplier_code = '';
  searchForm.supplier_name = '';
  pagination.value.currentPage = 1;
  fetchData();
};

const showAddDialog = () => {
  isEdit.value = false;
  const userId = authStore.user?.userId;
  if (!userId) {
    ElMessage.error("用户未登录，请重新登录");
    return;
  }
  Object.assign(form, {
    supplier_id: 0,
    supplier_code: generateSupplierCode(),
    supplier_name: '',
    description: '',
    contact_person: '',
    contact_phone: '',
    email: '',
    address: '',
    tax_number: '',
    status: 'active',
    created_by: userId,
    owner_id: userId
  });
  dialogVisible.value = true;
  console.log("新增供应商表单数据：", form);
};

const showEditDialog = (row: Supplier) => {
  isEdit.value = true;
  Object.assign(form, row);
  dialogVisible.value = true;
};

const handleSubmit = () => {
  console.log("提交前表单数据：", JSON.stringify(form));
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    submitLoading.value = true;
    try {
      if (isEdit.value) {
        const res = await supplierApi.updateSupplier(form.supplier_id, form);
        if (res.data.success) {
          ElMessage.success('更新成功');
        } else {
          ElMessage.error(res.data.message);
        }
      } else {
        const res = await supplierApi.createSupplier(form);
        console.log("新增接口返回：", res.data);
        if (res.data.success) {
          ElMessage.success('创建成功');
        } else {
          ElMessage.error(res.data.message);
        }
      }
      dialogVisible.value = false;
      fetchData();
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败');
    } finally {
      submitLoading.value = false;
    }
  });
};

const handleDelete = (row: Supplier) => {
  ElMessageBox.confirm('确认删除该供应商吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      const res = await supplierApi.deleteSupplier(row.supplier_id);
      if (res.data.success) {
        ElMessage.success('删除成功');
        fetchData();
      } else {
        ElMessage.error(res.data.message);
      }
    } catch (error: any) {
      ElMessage.error(error.message || '删除失败');
    }
  }).catch(() => {});
};

const handlePageChange = (newPage: number) => {
  pagination.value.currentPage = newPage;
  fetchData();
};

const triggerImport = () => {
  fileInput.value?.click();
};

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  loading.value = true;
  try {
    const res = await supplierApi.importSuppliers(formData);
    if (res.data.success) {
      ElMessage.success(res.data.message);
      fetchData();
    } else {
      ElMessage.error(res.data.message);
    }
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败');
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  try {
    const res = await supplierApi.exportSuppliers();
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'suppliers.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败');
  }
};

// 当组件从 keep-alive 中重新激活时，如果之前已点击查询，则只在数据为空时刷新数据
onActivated(() => {
  if (hasSearched.value && suppliers.value.length === 0) {
    fetchData();
  }
});

// 在查询按钮的点击事件中调用 fetchData
const handleSearch = async () => {
  await fetchData();
  // 此时 hasSearched 已被置为 true
};
</script>

<style scoped>
.supplier-view {
  padding: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.content-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.dialog-form {
  padding: 20px;
}
</style>
