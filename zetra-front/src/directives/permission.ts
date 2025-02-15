import type { Directive } from 'vue'
import { useAuthStore } from '@/stores/auth'

export const permission: Directive = {
  mounted(el: HTMLElement, binding) {
    const { value } = binding
    const authStore = useAuthStore()

    if (typeof value === 'string') {
      if (!authStore.hasPermission(value)) {
        el.parentNode?.removeChild(el)
      }
    } else if (Array.isArray(value)) {
      // 支持多个权限检查
      const hasPermission = value.some(perm => authStore.hasPermission(perm))
      if (!hasPermission) {
        el.parentNode?.removeChild(el)
      }
    }
  }
}
