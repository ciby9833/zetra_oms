/**
 * 上传错误类型
 */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * 文件类型配置
 */
export interface FileTypeConfig {
  accept: string[];
  maxSize: number;
  message?: string;
}

/**
 * 文件类型配置映射
 */
export const FILE_TYPES: Record<string, FileTypeConfig> = {
  image: {
    accept: ['.jpg', '.jpeg', '.png', '.gif'],
    maxSize: 5 * 1024 * 1024,
    message: '请上传 jpg、png、gif 格式的图片，大小不超过 5MB'
  },
  excel: {
    accept: ['.xlsx', '.xls'],
    maxSize: 10 * 1024 * 1024,
    message: '请上传 Excel 文件，大小不超过 10MB'
  },
  pdf: {
    accept: ['.pdf'],
    maxSize: 20 * 1024 * 1024,
    message: '请上传 PDF 文件，大小不超过 20MB'
  }
};

/**
 * 上传工具类
 */
export class UploadUtil {
  /**
   * 选择文件
   * @param options 选项
   * @returns Promise<File>
   */
  selectFile(options: {
    accept?: string;
    title?: string;
    multiple?: boolean;
  } = {}): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.accept || '*';
      input.multiple = options.multiple || false;

      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        if (files && files.length > 0) {
          resolve(files[0]);
        } else {
          reject(new UploadError('未选择文件'));
        }
      };

      input.click();
    });
  }

  /**
   * 验证文件
   * @param file 文件对象
   * @param type 文件类型
   * @throws {UploadError} 验证失败时抛出错误
   */
  validateFile(file: File, type: keyof typeof FILE_TYPES): void {
    const config = FILE_TYPES[type];
    if (!config) {
      throw new UploadError(`不支持的文件类型：${type}`);
    }

    // 验证文件类型
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!config.accept.includes(ext)) {
      throw new UploadError(config.message || '文件格式不正确');
    }

    // 验证文件大小
    if (file.size > config.maxSize) {
      throw new UploadError(config.message || '文件大小超出限制');
    }
  }

  /**
   * 获取文件的Base64编码
   * @param file 文件对象
   * @returns Promise<string>
   */
  getBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * 压缩图片
   * @param file 图片文件
   * @param options 压缩选项
   * @returns Promise<Blob>
   */
  async compressImage(
    file: File,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
  ): Promise<Blob> {
    const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);

        let width = img.width;
        let height = img.height;

        // 等比缩放
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new UploadError('浏览器不支持 Canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new UploadError('图片压缩失败'));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = () => reject(new UploadError('图片加载失败'));
    });
  }

  /**
   * 下载文件
   * @param url 文件URL
   * @param filename 文件名
   */
  downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// 导出单例实例
export const uploadUtil = new UploadUtil();
