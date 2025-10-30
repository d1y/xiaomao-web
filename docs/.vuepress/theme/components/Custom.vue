<template>
  <div class="tool-container">
    <div class="tab-buttons">
      <button :class="{ active: activeTab === 'encode' }" @click="activeTab = 'encode'">加密</button>
      <button :class="{ active: activeTab === 'decode' }" @click="activeTab = 'decode'">解密</button>
    </div>

    <div class="content" v-if="activeTab === 'encode'">
      <div class="radio-group">
        <label><input type="radio" value="url" v-model="encodeType"> 普通URL</label>
        <label><input type="radio" value="github" v-model="encodeType"> GitHub规则</label>
      </div>

      <div class="input-group" v-if="encodeType === 'url'">
        <input type="text" v-model="urlInput" placeholder="https://example.com/data.json">
      </div>

      <div class="input-group" v-else>
        <input type="text" v-model="githubUser" placeholder="GitHub User">
        <input type="text" v-model="githubRepo" placeholder="GitHub Repo">
        <input type="text" v-model="githubBranch" placeholder="Branch">
        <input type="text" v-model="githubPath" placeholder="文件路径">
      </div>

      <button class="action-btn" @click="handleEncode">生成</button>

      <div class="result" v-if="encodeResult">
        <textarea readonly :value="encodeResult"></textarea>
        <button class="copy-btn" @click="copyText(encodeResult)">复制</button>
      </div>
    </div>

    <div class="content" v-else>
      <div class="input-group">
        <textarea v-model="decodeInput" placeholder="输入加密字符串"></textarea>
      </div>

      <button class="action-btn" @click="handleDecode">解密</button>

      <div class="result" v-if="decodeResult">
        <textarea readonly :value="decodeResult"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const activeTab = ref('encode');
const encodeType = ref('url');
const urlInput = ref('');
const githubUser = ref('');
const githubRepo = ref('');
const githubBranch = ref('');
const githubPath = ref('');
const decodeInput = ref('');
const encodeResult = ref('');
const decodeResult = ref('');

const btoaUtf8 = (str) => btoa(unescape(encodeURIComponent(str)));
const atobUtf8 = (str) => decodeURIComponent(escape(atob(str)));

const handleEncode = () => {
  let content = '';
  if (encodeType.value === 'url') {
    if (!urlInput.value.trim()) return alert('请输入URL');
    content = urlInput.value.trim();
  } else {
    const u = githubUser.value.trim();
    const r = githubRepo.value.trim();
    const p = githubPath.value.trim();
    if (!u || !r || !p) return alert('User、Repo、路径必填');
    const b = githubBranch.value.trim() || 'main';
    content = `g${u}/${r}#${b}/${p}`;
  }
  encodeResult.value = 'b' + btoaUtf8(content);
};

const handleDecode = () => {
  const input = decodeInput.value.trim();
  if (!input) return alert('请输入加密字符串');
  const lines = input.split('\n').filter(l => l.trim());
  const res = [];
  lines.forEach(l => {
    if (l.startsWith('b')) {
      try {
        const d = atobUtf8(l.substring(1));
        if (d.startsWith('g')) {
          const parts = d.substring(1).split('/');
          if (parts.length >= 3) {
            const [u, rb, ...pp] = parts;
            const [r, b = 'main'] = rb.split('#');
            res.push(`https://raw.githubusercontent.com/${u}/${r}/${b}/${pp.join('/')}`);
          } else res.push(`GitHub格式错：${d}`);
        } else res.push(d);
      } catch (e) {
        res.push(`解密失败[${l}]：${e.message}`);
      }
    } else res.push(`非加密格式：${l}`);
  });
  decodeResult.value = res.join('\n');
};

const copyText = (text) => {
  navigator.clipboard.writeText(text)
    .then(() => alert('复制成功'))
    .catch(() => alert('复制失败，请手动复制'));
};
</script>

<style scoped>
/* 彻底移除按钮背景，仅保留边框和文字区分 */
.tool-container {
  max-width: 600px;
  width: 100%;
  padding: 20px;
  border-radius: 12px;
}

.tab-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-buttons button {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd; /* 未选中边框浅灰 */
  background: transparent; /* 彻底移除背景 */
  color: #666; /* 未选中文字深灰 */
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

/* 选中状态 - 亮紫色强调，对比度拉满 */
.tab-buttons button.active {
  border-color: #7c3aed !important; /* 亮紫色边框 */
  color: #7c3aed !important; /* 紫色文字 */
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2); /* 外发光强调 */
}

/* 暗色模式适配（边框和文字颜色调整，无背景） */
@media (prefers-color-scheme: dark) {
  .tab-buttons button {
    border-color: #555;
    color: #ccc;
  }
  
  .tab-buttons button.active {
    border-color: #a855f7 !important; /* 暗色亮紫色边框 */
    color: #a855f7 !important; /* 暗色紫色文字 */
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
  }

  .radio-group,
  .input-group input, 
  .input-group textarea,
  .result textarea {
    color: #ddd;
    border-color: #555;
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.radio-group {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #666;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group input, .input-group textarea {
  padding: 10px;
  border: 1px solid #ddd;
  background: transparent;
  color: #666;
  font-size: 14px;
  border-radius: 6px;
}

/* 主按钮 - 渐变紫蓝，视觉突出 */
.action-btn {
  padding: 12px;
  border: none;
  background: linear-gradient(135deg, #6699ff 0%, #9966ff 100%);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  border-radius: 8px;
  transition: transform 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.result {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result textarea {
  padding: 10px;
  border: 1px solid #ddd;
  background: transparent;
  min-height: 80px;
  resize: vertical;
  font-size: 14px;
  border-radius: 6px;
}

/* 复制按钮 - 淡紫风格，与主色调呼应 */
.copy-btn {
  padding: 8px 16px;
  border: 1px solid #9966ff;
  background: transparent; /* 移除复制按钮背景 */
  color: #9966ff;
  cursor: pointer;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: rgba(153, 102, 255, 0.1); /* 悬浮时仅加淡色背景 */
}

/* 暗色模式下复制按钮调整 */
@media (prefers-color-scheme: dark) {
  .copy-btn {
    color: #a855f7;
    border-color: #9966ff;
  }
  
  .copy-btn:hover {
    background: rgba(168, 85, 247, 0.1);
  }
}
</style>