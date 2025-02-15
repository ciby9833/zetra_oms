import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFormStore = defineStore('form', () => {
  // 存储每个路由路径对应的表单状态
  const dirtyForms = ref<Record<string, boolean>>({});

  // 设置表单状态
  const setFormDirty = (path: string, isDirty: boolean) => {
    dirtyForms.value[path] = isDirty;
  };

  // 检查表单是否有未保存的更改
  const isFormDirty = (path: string) => {
    return dirtyForms.value[path] || false;
  };

  // 清除表单状态
  const clearFormState = (path: string) => {
    delete dirtyForms.value[path];
  };

  return {
    dirtyForms,
    setFormDirty,
    isFormDirty,
    clearFormState
  };
});
