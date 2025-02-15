// 签名工具
import { Base64 } from 'js-base64';

export function generateSignature(data: string, timestamp: string, apiKey: string): string {
  // 1. 构建签名字符串
  const signString = `${data}${apiKey}`;

  // 2. Base64 编码
  return Base64.encode(signString);
}

export function generateTimestamp(): string {
  return Date.now().toString();
}

export function generateApiKey(): string {
  return 'zetra_keyadmin';
}
