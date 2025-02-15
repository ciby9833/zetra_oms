<template>
  <div class="permission-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>权限管理</span>
        </div>
      </template>

      <el-form :model="form" label-width="100px">
        <el-form-item label="权限列表">
          <el-tree
            ref="permissionTree"
            :data="permissionTreeData"
            show-checkbox
            node-key="code"
            :props="defaultProps"
            @check-change="handleCheckChange"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSave">
            保存
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { usePermissionStore } from '@/stores/permission';

interface TreeNode {
  code: string;
  label: string;
  children?: TreeNode[];
}

const props = defineProps<{
  userId: number
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

const permissionStore = usePermissionStore();
const permissionTree = ref();
const form = ref({
  permissions: [] as string[]
});

const selectedPermissions = ref<string[]>([]);

// 权限树数据结构
const permissionTreeData = [
  {
    label: '物料管理',
    code: 'material',
    children: [
      { label: '查看物料', code: 'material.view' },
      { label: '新增物料', code: 'material.add' },
      { label: '编辑物料', code: 'material.edit' },
      { label: '删除物料', code: 'material.delete' },
      { label: '导入物料', code: 'material.import' },
      { label: '导出物料', code: 'material.export' }
    ]
  }
];

const defaultProps = {
  children: 'children',
  label: 'label'
};

// 处理权限变更
const handleCheckChange = () => {
  const checkedNodes = permissionTree.value.getCheckedNodes() as TreeNode[];
  selectedPermissions.value = checkedNodes
    .filter(node => !node.children)
    .map(node => node.code);
};

// 保存权限
const handleSave = async () => {
  try {
    const success = await permissionStore.assignPermissions(
      props.userId,
      selectedPermissions.value
    );

    if (success) {
      ElMessage.success('权限更新成功');
      emit('success');
    } else {
      throw new Error('权限更新失败');
    }
  } catch (error) {
    console.error('保存权限失败:', error);
    ElMessage.error('保存权限失败');
  }
};

onMounted(async () => {
  try {
    await permissionStore.loadUserPermissions(props.userId);
    const userPerms = permissionStore.userPermissions.get(props.userId) || [];
    selectedPermissions.value = userPerms;
  } catch (error) {
    console.error('加载权限失败:', error);
    ElMessage.error('加载权限失败');
  }
});
</script>
