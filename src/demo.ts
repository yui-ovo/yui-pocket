export interface DemoMessage {
  id: string;
  sender: 'friend' | 'self';
  text: string;
  sample: boolean;
}

/** v0.1: one ephemeral source of truth, deliberately no persistence or host chat API. */
export function createDemo() {
  let sequence = 3;
  const messages: DemoMessage[] = [
    { id: 'demo-1', sender: 'friend', text: '路口的小花店开门啦。\n橱窗里有一小束粉色雏菊。', sample: true },
    { id: 'demo-2', sender: 'self', text: '那就在那里碰面吧 ♡', sample: true },
    { id: 'demo-3', sender: 'friend', text: '好呀，给你留一朵。', sample: true },
  ];
  return {
    list: (): readonly DemoMessage[] => messages,
    send(text: string): DemoMessage | null {
      const value = text.trim();
      if (!value || value.length > 2000) return null;
      const message: DemoMessage = { id: `demo-${++sequence}`, sender: 'self', text: value, sample: false };
      messages.push(message);
      return message;
    },
    clear() { messages.length = 0; },
  };
}
