<template>
  <div class="users-view">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="角色" class="form-item-small">
          <el-select
            v-model="searchForm.role"
            clearable
            placeholder="选择角色"
            class="w-150"
          >
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词" class="form-item-medium">
          <el-input
            v-model="searchForm.keyword"
            placeholder="用户名/邮箱"
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
          <span class="title">用户列表</span>
          <el-button type="primary" @click="showAddDialog">新增用户</el-button>
        </div>
      </template>

      <el-table
        :data="users"
        v-loading="loading"
        style="width: 100%"
        border
      >
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="employee_number" label="工号" width="120" align="center" />
        <el-table-column label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.user_role)" size="small">
              {{ getRoleText(row.user_role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="账号类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.account_type === 'master' ? 'success' : 'info'" size="small">
              {{ row.account_type === 'master' ? '主账号' : '子账号' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" align="center" />
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button-group>
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
      :title="isEdit ? '编辑用户' : '新增用户'"
      v-model="dialogVisible"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item
          label="密码"
          prop="password"
          v-if="!isEdit"
        >
          <el-input
            v-model="form.password"
            type="password"
            show-password
          />
        </el-form-item>
        <el-form-item label="姓名" prop="full_name">
          <el-input v-model="form.full_name" />
        </el-form-item>
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
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'UsersView'
});
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { userApi, type SubUser } from '@/api/user';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useViewStore } from '@/stores/view';
import type { TableRecord } from '@/stores/view';


const router = useRouter();
const authStore = useAuthStore();
const viewStore = useViewStore();
const viewName = 'users';

const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const users = ref<SubUser[]>([]);
const formRef = ref<FormInstance>();

// 定义用户数据类型
interface UserRecord extends TableRecord {
  userId: number;
  username: string;
  email: string;
  user_role: string;
  account_type: string;
  employee_number?: string;
  created_at: string;
}

// 搜索表单
const searchForm = ref({
  role: '',
  keyword: ''
});

// 表单数据
const form = ref({
  userId: undefined as number | undefined,
  username: '',
  email: '',
  password: '',
  full_name: '',
  status: 'active' as const
});

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: !isEdit.value, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码不能少于 6 个字符', trigger: 'blur' }
  ]
};

// 状态选项
const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
];

// 过滤后的用户列表
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchKeyword = !searchForm.value.keyword ||
      user.username.toLowerCase().includes(searchForm.value.keyword.toLowerCase()) ||
      user.email.toLowerCase().includes(searchForm.value.keyword.toLowerCase());

    const matchStatus = !searchForm.value.status ||
      user.status === searchForm.value.status;

    return matchKeyword && matchStatus;
  });
});

// 获取数据
const fetchData = async () => {
  loading.value = true;
  try {
    const response = await userApi.getSubUsers(searchForm.value);
    const data = response.data.data;

    // 更新视图状态
    viewStore.updateTableData<UserRecord>(viewName, data);
    viewStore.updateSearchForm(viewName, searchForm.value);

    users.value = data;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    ElMessage.error('获取用户列表失败');
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
    role: '',
    keyword: ''
  };
  viewStore.updateSearchForm(viewName, searchForm.value);
  fetchData();
};

// 显示添加对话框
const showAddDialog = () => {
  isEdit.value = false;
  form.value = {
    userId: undefined,
    username: '',
    email: '',
    password: '',
    full_name: '',
    status: 'active'
  };
  dialogVisible.value = true;
};

// 显示编辑对话框
const showEditDialog = (row: SubUser) => {
  isEdit.value = true;
  form.value = {
    userId: row.userId,
    username: row.username,
    email: row.email,
    password: '',
    full_name: row.full_name || '',
    status: row.status
  };
  dialogVisible.value = true;
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isEdit.value) {
      if (!form.value.userId) {
        throw new Error('用户ID不存在');
      }

      await userApi.updateSubUser(form.value.userId, {
        email: form.value.email,
        full_name: form.value.full_name,
        status: form.value.status
      });
      ElMessage.success('更新成功');
    } else {
      await userApi.createSubUser(form.value);
      ElMessage.success('添加成功');
    }

    dialogVisible.value = false;
    await fetchData();
  } catch (error: any) {
    console.error('提交失败:', error);
    ElMessage.error(error.response?.data?.message || (isEdit.value ? '更新失败' : '添加失败'));
  } finally {
    submitLoading.value = false;
  }
};

// 更改状态
const handleStatusChange = async (row: SubUser) => {
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? '启用' : '禁用';

    await ElMessageBox.confirm(
      `确定要${actionText}该用户吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await userApi.updateSubUserStatus(row.userId, newStatus);
    ElMessage.success(`${actionText}成功`);
    await fetchData();  // 刷新列表
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败');
      console.error('状态更新失败:', error);
    }
  }
};

// 删除用户
const handleDelete = async (row: SubUser) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该用户吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await userApi.deleteSubUser(row.userId);
    ElMessage.success('删除成功');
    await fetchData();  // 刷新列表
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
      console.error('删除失败:', error);
    }
  }
};

// 编辑用户
const handleEdit = async (formData: any) => {
  try {
    loading.value = true;
    await userApi.updateSubUser(formData.userId, formData);
    ElMessage.success('更新成功');
    dialogVisible.value = false;
    await fetchData();  // 刷新列表
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '更新失败');
    console.error('更新失败:', error);
  } finally {
    loading.value = false;
  }
};

// 获取状态类型
const getStatusType = (status: string) => {
  return status === 'active' ? 'success' : 'danger';
};

// 获取状态文本
const getStatusText = (status: string) => {
  return status === 'active' ? '启用' : '禁用';
};

// 获取角色类型
const getRoleType = (role: string) => {
  const types: Record<string, string> = {
    admin: 'danger',
    super_admin: 'warning',
    user: 'success'
  };
  return types[role] || 'info';
};

// 获取角色文本
const getRoleText = (role: string) => {
  const texts: Record<string, string> = {
    admin: '管理员',
    super_admin: '超级管理员',
    user: '普通用户'
  };
  return texts[role] || role;
};

// 组件挂载时恢复状态
onMounted(async () => {
  // 检查权限
  if (!authStore.hasRole(['admin', 'super_admin'])) {
    ElMessage.error('无权限，请联系管理员开通');
    router.push('/dashboard');
    return;
  }

  // 恢复状态
  const state = viewStore.getViewState<UserRecord>(viewName);
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
.users-view {
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
