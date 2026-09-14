import { startInHost } from './host';
import { mountPhone } from './phone';

try {
  startInHost(window, mountPhone);
} catch {
  // Fixed diagnostic only: never log host context, messages or credentials.
  console.error('[yui-pocket] 无法挂载演示手机，请确认助手同源脚本环境。');
}
