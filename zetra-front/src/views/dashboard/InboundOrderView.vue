<template>
  <!-- 新增一个分割容器 -->
  <div class="split-container" :class="{ 'with-editor': dialogVisible }">
    <div class="left-content">
      <el-card class="order-card">
        <!-- 搜索区域 -->
        <el-card class="search-card">
          <el-form :model="searchForm" label-width="100px" inline>
            <el-form-item label="入库单号">
              <el-input v-model="searchForm.order_number" placeholder="请输入入库单号"></el-input>
            </el-form-item>
            <el-form-item label="入库类型">
              <el-select v-model="searchForm.inbound_type"
                placeholder="请选择入库类型" clearable style="min-width: 200px">
                <el-option label="采购" value="采购" />
                <el-option label="调拨" value="调拨" />
                <el-option label="退货" value="退货" />
                <el-option label="盘盈单" value="盘盈单" />
              </el-select>
            </el-form-item>
            <el-form-item label="入库日期">
              <el-date-picker
                v-model="searchForm.inbound_date"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="开始日期"
                end-placeholder="结束日期" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">查询</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 入库单列表 -->
        <el-card class="content-card">
          <div class="card-header">
            <span class="title">入库单列表</span>
            <div class="header-buttons">
              <el-button size="small" type="primary" @click="showAddDialog">新增</el-button>
              <el-button size="small" type="success" @click="exportInboundOrders">导出</el-button>
            </div>
          </div>
          <el-table :data="orders" border stripe>
            <el-table-column prop="order_number" label="入库单号" width="150"></el-table-column>
            <el-table-column prop="inbound_type" label="入库类型" width="100"></el-table-column>
            <el-table-column prop="warehouse_name" label="仓库" width="150"></el-table-column>
            <el-table-column prop="supplier_name" label="供应商" width="150"></el-table-column>
            <el-table-column prop="inbound_date" label="入库日期" width="180" :formatter="formatDate"></el-table-column>
            <el-table-column prop="status" label="状态" width="100"></el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="scope">
                <el-button size="mini" type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                <el-button size="mini" type="danger" @click="handleDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            background
            layout="prev, pager, next, jumper, ->, total"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            :current-page="pagination.currentPage"
            @current-change="handlePageChange">
          </el-pagination>
        </el-card>
      </el-card>
    </div>

    <!-- 右侧编辑区域（内嵌而非弹出），增加 resizer -->
    <div v-if="dialogVisible" class="resizer" @mousedown="startResizing"></div>
    <div v-if="dialogVisible" class="right-panel" :style="{ width: rightPanelWidth + 'px' }">
      <div class="panel-header">
        <span>{{ isEditing ? '编辑入库单' : '新增入库单' }}</span>
        <el-button type="text" icon="el-icon-close" @click="dialogVisible = false"></el-button>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="入库单号" prop="order_number">
          <el-input v-model="form.order_number" :readonly="isEditing" placeholder="系统自动生成或手动输入"></el-input>
        </el-form-item>
        <el-form-item label="仓库" prop="warehouse_id">
          <el-select v-model="form.warehouse_id" placeholder="请选择仓库">
            <el-option
              v-for="w in warehouses"
              :key="w.warehouse_id"
              :label="w.warehouse_name"
              :value="w.warehouse_id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="供应商" prop="supplier_id">
          <el-select v-model="form.supplier_id" placeholder="请选择供应商">
            <el-option
              v-for="s in suppliers"
              :key="s.supplier_id"
              :label="s.supplier_name"
              :value="s.supplier_id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="入库日期" prop="inbound_date">
          <el-date-picker v-model="form.inbound_date" type="date" placeholder="请选择入库日期"></el-date-picker>
        </el-form-item>
        <el-form-item label="入库类型" prop="inbound_type">
          <el-select v-model="form.inbound_type" placeholder="请选择入库类型">
            <el-option label="采购" value="采购" />
            <el-option label="调拨" value="调拨" />
            <el-option label="退货" value="退货" />
            <el-option label="盘盈单" value="盘盈单" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remarks">
          <el-input type="textarea" v-model="form.remarks"></el-input>
        </el-form-item>
        <el-form-item label="入库单明细">
          <el-table :data="form.items" border style="width: 100%">
            <el-table-column label="物料">
              <template #default="scope">
                <el-select
                  v-model="scope.row.material_id"
                  placeholder="请选择物料"
                  filterable
                  remote
                  :remote-method="queryMaterials"
                  :loading="materialsLoading"
                  @change="handleMaterialChange(scope.row)"
                  teleported="false"
                  @visible-change="handleVisibleChange">
                  <el-option
                    v-for="m in materials"
                    :key="m.material_id || m.id"
                    :label="m.material_name || m.name"
                    :value="m.material_id || m.id">
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="数量">
              <template #default="scope">
                <el-input v-model="scope.row.quantity" placeholder="请输入数量"></el-input>
              </template>
            </el-table-column>
            <el-table-column label="单价">
              <template #default="scope">
                <el-input v-model="scope.row.unit_cost" placeholder="请输入单价"></el-input>
              </template>
            </el-table-column>
            <el-table-column label="单位">
              <template #default="scope">
                <el-input v-model="scope.row.unit_name" disabled placeholder="单位"></el-input>
              </template>
            </el-table-column>
            <el-table-column label="分类">
              <template #default="scope">
                <el-input v-model="scope.row.category_name" disabled placeholder="分类"></el-input>
              </template>
            </el-table-column>
            <el-table-column label="规格">
              <template #default="scope">
                <el-input v-model="scope.row.specifications" disabled placeholder="规格"></el-input>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="scope">
                <el-button type="danger" icon="el-icon-delete" @click="deleteItem(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" icon="el-icon-plus" style="margin-top: 10px" @click="addItem">新增明细</el-button>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { inboundOrderApi } from '@/api/inboundOrder';
import { useAuthStore } from '@/stores/auth';
import { warehouseApi } from '@/api/warehouse';
import { supplierApi } from '@/api/supplier';
import { fetchMaterials } from '@/api/material';
import { getInboundOrderById, updateInboundOrder, createInboundOrder } from '@/api/inboundOrder';
import request from './request';
import axios from 'axios';
import { saveAs } from 'file-saver';

// 将 authStore 提前声明，保证整个组件中都能正常使用
const authStore = useAuthStore();

const searchForm = reactive({
  order_number: '',
  inbound_type: '',
  inbound_date: [] as string[]
});
const orders = ref<any[]>([]);
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 定义仓库与供应商数据
const warehouses = ref([]);
const suppliers = ref([]);

const fetchWarehouses = async () => {
  try {
    const res = await warehouseApi.getWarehouses();
    if (res.data.success) {
      warehouses.value = res.data.data;
    }
  } catch (error) {
    console.error("获取仓库数据失败", error);
  }
};

const fetchSuppliers = async () => {
  try {
    const res = await supplierApi.getSuppliers();
    if (res.data.success) {
      suppliers.value = res.data.data;
    }
  } catch (error) {
    console.error("获取供应商数据失败", error);
  }
};

const dialogVisible = ref(false);
const isEditing = ref(false);
const formRef = ref<any>(null);
const form = reactive({
  inbound_order_id: null,
  order_number: '',
  warehouse_id: null,
  supplier_id: null,
  inbound_date: '',
  inbound_type: '',
  remarks: '',
  items: [] as any[]
});
const rules = {
  order_number: [{ required: true, message: '请输入入库单号', trigger: 'blur' }],
  warehouse_id: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  inbound_date: [{ required: true, message: '请选择入库日期', trigger: 'change' }],
  inbound_type: [{ required: true, message: '请选择入库类型', trigger: 'change' }]
};

// 从 material API 获取物料数据（物料 API 已在 /src/api/material/index.ts 导出）
const materials = ref([]);

// 为远程搜索和分页加载新增变量
const materialsLoading = ref(false);
const materialsQuery = ref("");
const materialPage = ref(1);
const materialPageSize = ref(10);
const totalMaterials = ref(0);

// 用于远程搜索（当用户输入关键字时触发）
const queryMaterials = async (query: string) => {
  materialsQuery.value = query;
  materialPage.value = 1; // 查询时重置分页
  try {
    materialsLoading.value = true;
    // 假设后端支持分页查询并返回格式 { total, data: [...] }
    const { data } = await fetchMaterials({ keyword: query, page: materialPage.value, pageSize: materialPageSize.value });
    // 如果返回分页数据，实际数据在 data.data
    totalMaterials.value = data.total || 0;
    materials.value = data && data.list !== undefined ? data.list : data;
    materialsLoading.value = false;
  } catch (error) {
    console.error('查询物料数据异常:', error);
    materialsLoading.value = false;
  }
};

// 用于加载更多数据（滚动到底部时触发）
const loadMoreMaterials = async () => {
  // 如果已加载数据没有达到总量，则加载下一页
  if (materials.value.length < totalMaterials.value) {
    materialPage.value++;
    try {
      materialsLoading.value = true;
      const { data } = await fetchMaterials({ keyword: materialsQuery.value, page: materialPage.value, pageSize: materialPageSize.value });
      const newList = data && data.list !== undefined ? data.list : data;
      // 追加新数据
      materials.value = materials.value.concat(newList);
      materialsLoading.value = false;
    } catch (error) {
      console.error('加载更多物料数据异常:', error);
      materialsLoading.value = false;
    }
  }
};

// 新增：滚动事件处理函数
const handleDropdownScroll = () => {
  const dropdown = document.querySelector('.el-select-dropdown .el-scrollbar__wrap');
  if (dropdown) {
    const threshold = 20;
    if (dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - threshold) {
      console.log('滚动到底部，加载更多……');
      loadMoreMaterials();
    }
  }
};

// 当下拉框显示状态改变时触发
const handleVisibleChange = (visible: boolean) => {
  if (visible) {
    // 延时500毫秒等待下拉框完全渲染
    setTimeout(() => {
      const dropdown = document.querySelector('.el-select-dropdown .el-scrollbar__wrap');
      if (dropdown) {
        dropdown.addEventListener('scroll', handleDropdownScroll);
        console.log('已添加下拉框滚动监听', dropdown);
      } else {
        console.log('未找到下拉框滚动容器');
      }
    }, 500);
  } else {
    const dropdown = document.querySelector('.el-select-dropdown .el-scrollbar__wrap');
    if (dropdown) {
      dropdown.removeEventListener('scroll', handleDropdownScroll);
      console.log('已移除下拉框滚动监听');
    }
  }
};

// 如果页面进入时需要默认加载前10条记录，可以在 onMounted 中调用
const fetchMaterialsHandler = async () => {
  try {
    // 默认查询空关键字，加载第一页
    const { data } = await fetchMaterials({ page: materialPage.value, pageSize: materialPageSize.value });
    totalMaterials.value = data.total || 0;
    materials.value = data && data.list !== undefined ? data.list : data;
  } catch (error) {
    console.error('初始化获取物料数据异常:', error);
  }
};

const addItem = () => {
  form.items.push({
    material_id: null,
    material_name: '',
    quantity: '',
    unit: null,
    unit_name: '',
    unit_cost: '',
    category_id: null,
    category_name: '',
    specifications: ''
  });
};

const deleteItem = (index: number) => {
  form.items.splice(index, 1);
};

const handleMaterialChange = (row: any) => {
  const selected = materials.value.find((m: any) => (m.material_id || m.id) === row.material_id);
  if (selected) {
    row.material_name = selected.material_name || selected.name;
    row.unit = selected.unit;
    row.unit_name = selected.unit_name;
    row.category_id = selected.category_id;
    row.category_name = selected.category_name;
    row.specifications = selected.specifications;
  } else {
    row.material_name = '';
    row.unit = null;
    row.unit_name = '';
    row.category_id = null;
    row.category_name = '';
    row.specifications = '';
  }
};

// 已存在的 formatDate 用于表格日期显示
const formatDate = (row: any, column: any, cellValue: string): string => {
  if (!cellValue) return '';
  // 简单处理：取 ISO 格式日期中的日期部分
  return cellValue.split('T')[0];
};

const fetchOrders = async () => {
  const params = {
    ...searchForm,
    page: pagination.currentPage,
    pageSize: pagination.pageSize
  };
  // 直接传递用户选择的日期，不做任何转换；确保 searchForm.inbound_date为 ["2025-02-13", "2025-02-13"] 这样的数组
  try {
    const res = await inboundOrderApi.getInboundOrders(params);
    if (res.success) {
      orders.value = res.data;
      pagination.total = res.total;
    } else {
      ElMessage.error(res.message);
    }
  } catch (err: any) {
    ElMessage.error(err.message || '查询失败');
  }
};

const handleSearch = async () => {
  pagination.currentPage = 1;
  await fetchOrders();
};

const resetSearch = async () => {
  searchForm.order_number = '';
  searchForm.inbound_type = '';
  searchForm.inbound_date = [];
  pagination.currentPage = 1;
  await fetchOrders();
};

const handlePageChange = async (page: number) => {
  pagination.currentPage = page;
  await fetchOrders();
};

const showAddDialog = () => {
  isEditing.value = false;
  form.order_number = '';
  form.warehouse_id = null;
  form.supplier_id = null;
  form.inbound_date = '';
  form.inbound_type = '';
  form.remarks = '';
  form.items = [];
  dialogVisible.value = true;
};

const handleEdit = async (row: any) => {
  try {
    const res = await getInboundOrderById(row.inbound_order_id);
    if (res.success) {
      Object.assign(form, res.data);
      form.items = res.data.items || [];
      form.items.forEach(item => {
        handleMaterialChange(item);
      });
      isEditing.value = true;
      dialogVisible.value = true;
    } else {
      ElMessage.error('获取入库单详情失败：' + res.message);
    }
  } catch (error: any) {
    ElMessage.error('获取入库单详情时发生错误：' + error.message);
  }
};

const handleSubmit = () => {
  (formRef.value as any).validate(async (valid: boolean) => {
    if (!valid) return;
    try {
      let res;
      const payload = {
        order_number: form.order_number,
        warehouse_id: form.warehouse_id,
        supplier_id: form.supplier_id,
        inbound_date: form.inbound_date,
        inbound_type: form.inbound_type,
        remarks: form.remarks,
        created_by: 0,
        owner_id: 0,
        items: form.items.map(item => ({
          material_id: item.material_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        }))
      };
      if (isEditing.value) {
        res = await updateInboundOrder(form.inbound_order_id, payload);
      } else {
        res = await createInboundOrder(payload);
      }
      if (res.success) {
        ElMessage.success(isEditing.value ? '更新成功' : '创建成功');
        dialogVisible.value = false;
        // 刷新数据...
      } else {
        ElMessage.error(res.message);
      }
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败');
    }
  });
};

const handleDelete = async (row: any) => {
  try {
    await inboundOrderApi.deleteInboundOrder(row.inbound_order_id);
    ElMessage.success('删除成功');
    await fetchOrders();
  } catch (err: any) {
    ElMessage.error(err.message || '删除失败');
  }
};

const exportInboundOrders = async () => {
  try {
    // 从 authStore 获取 token（假设 authStore.token 可用）
    const token = authStore.token;
    const response = await axios.get('/api/inbound-orders/export', {
      params: searchForm,
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${token}`  // 添加 token
      }
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, 'inbound_orders.xlsx');
  } catch (error) {
    console.error('导出入库单错误：', error);
  }
};

const rightPanelWidth = ref(600);
const resizing = ref(false);
let startX = 0;
let startWidth = 0;

const startResizing = (e: MouseEvent) => {
  resizing.value = true;
  startX = e.clientX;
  startWidth = rightPanelWidth.value;
  document.addEventListener("mousemove", doResizing);
  document.addEventListener("mouseup", stopResizing);
};

const doResizing = (e: MouseEvent) => {
  if (!resizing.value) return;
  const diff = startX - e.clientX;
  rightPanelWidth.value = startWidth + diff;
};

const stopResizing = () => {
  resizing.value = false;
  document.removeEventListener("mousemove", doResizing);
  document.removeEventListener("mouseup", stopResizing);
};

onMounted(() => {
  fetchWarehouses();
  fetchSuppliers();
  fetchMaterialsHandler();
  fetchOrders();
});
</script>

<style scoped>
.inbound-order-view {
  padding: 20px;
}

/* 分割容器 */
.split-container {
  display: flex;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  transition: all 0.3s ease;
}

/* 左侧内容区域始终占用剩余空间 */
.left-content {
  flex: 1;
  transition: flex 0.3s ease;
  min-width: 300px; /* 根据需要调整最小宽度 */
}

/* 右侧编辑面板 */
.right-panel {
  background: #fff;
  box-shadow: -2px 0 6px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: width 0.3s ease;
}

.search-card {
  margin-bottom: 20px;
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

/* 调整 header-buttons 中按钮的高度 */
.header-buttons .el-button {
  height: 32px;
  line-height: 32px;
  padding: 0 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 拖动条样式 */
.resizer {
  width: 5px;
  cursor: ew-resize;
  background-color: #d3dce6;
  height: 100%;
}
</style>
